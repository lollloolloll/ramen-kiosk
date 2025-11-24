"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { updateUser } from "@/lib/actions/generalUser";
import { generalUserSchema } from "@/lib/validators/generalUser";
import { useState, useEffect, useMemo } from "react";
import { z } from "zod";
import { generalUsers } from "@drizzle/schema";

type GeneralUser = typeof generalUsers.$inferSelect;
type GeneralUserFormValues = z.infer<typeof generalUserSchema>;

interface EditUserFormProps {
  user: GeneralUser;
  children: React.ReactNode;
}

const formatPhoneNumber = (value: string) => {
  if (!value) return value;
  const phoneNumber = value.replace(/[^\d]/g, "");
  const phoneNumberLength = phoneNumber.length;
  if (phoneNumberLength < 4) return phoneNumber;
  if (phoneNumberLength < 8) {
    return `${phoneNumber.slice(0, 3)}-${phoneNumber.slice(3)}`;
  }
  return `${phoneNumber.slice(0, 3)}-${phoneNumber.slice(
    3,
    7
  )}-${phoneNumber.slice(7, 11)}`;
};

const getSchoolParts = (school: string | null) => {
  if (!school || school === "해당없음") {
    return { level: "해당없음", name: "" };
  }
  const lastChar = school.slice(-1);
  const name = school.slice(0, -1);
  switch (lastChar) {
    case "초":
      return { level: "초등학교", name };
    case "중":
      return { level: "중학교", name };
    case "고":
      return { level: "고등학교", name };
    case "대":
      return { level: "대학교", name };
    default:
      return { level: "", name: school };
  }
};

export function EditUserForm({ user, children }: EditUserFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initialBirthDate = user.birthDate ? user.birthDate.split("-") : [];
  const initialSchool = getSchoolParts(user.school);

  const [birthYear, setBirthYear] = useState<string | undefined>(
    initialBirthDate[0]
  );
  const [birthMonth, setBirthMonth] = useState<string | undefined>(
    initialBirthDate[1]
  );
  const [birthDay, setBirthDay] = useState<string | undefined>(
    initialBirthDate[2]
  );

  const [schoolLevel, setSchoolLevel] = useState(initialSchool.level);
  const [schoolName, setSchoolName] = useState(initialSchool.name);

  const form = useForm<GeneralUserFormValues>({
    resolver: zodResolver(generalUserSchema),
    defaultValues: {
      name: user.name || "",
      phoneNumber: user.phoneNumber || "",
      gender: user.gender || "",
      birthDate: user.birthDate || "",
      school: user.school || "",
      personalInfoConsent: user.personalInfoConsent ?? false,
    },
  });

  useEffect(() => {
    if (open) {
      const birthDateParts = user.birthDate ? user.birthDate.split("-") : [];
      const schoolParts = getSchoolParts(user.school);

      form.reset({
        name: user.name || "",
        phoneNumber: user.phoneNumber || "",
        gender: user.gender || "",
        birthDate: user.birthDate || "",
        school: user.school || "",
        personalInfoConsent: user.personalInfoConsent ?? false,
      });

      setBirthYear(birthDateParts[0]);
      setBirthMonth(birthDateParts[1]);
      setBirthDay(birthDateParts[2]);
      setSchoolLevel(schoolParts.level);
      setSchoolName(schoolParts.name);
    }
  }, [open, user, form]);

  useEffect(() => {
    if (birthYear && birthMonth && birthDay) {
      form.setValue("birthDate", `${birthYear}-${birthMonth}-${birthDay}`);
    } else {
      form.setValue("birthDate", "");
    }
  }, [birthYear, birthMonth, birthDay, form]);

  useEffect(() => {
    if (schoolLevel === "해당없음") {
      form.setValue("school", "해당없음");
      setSchoolName("");
    } else if (schoolLevel && schoolName) {
      let suffix = "";
      switch (schoolLevel) {
        case "초등학교":
          suffix = "초";
          break;
        case "중학교":
          suffix = "중";
          break;
        case "고등학교":
          suffix = "고";
          break;
        case "대학교":
          suffix = "대";
          break;
        default:
          suffix = "";
      }
      form.setValue("school", `${schoolName}${suffix}`);
    } else {
      form.setValue("school", "");
    }
  }, [schoolLevel, schoolName, form]);

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from(
      { length: currentYear - 1929 },
      (_, i) => currentYear - i
    );
  }, []);

  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);

  const days = useMemo(() => {
    if (!birthYear || !birthMonth) {
      return Array.from({ length: 31 }, (_, i) => i + 1);
    }
    const daysInMonth = new Date(
      parseInt(birthYear),
      parseInt(birthMonth),
      0
    ).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }, [birthYear, birthMonth]);

  async function onSubmit(values: GeneralUserFormValues) {
    setIsSubmitting(true);
    try {
      const result = await updateUser(user.id, values);
      if (result.error) {
        throw new Error(result.error);
      }
      if (result.success) {
        toast.success("사용자 정보가 성공적으로 업데이트되었습니다!");
        router.refresh();
        setOpen(false);
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "사용자 정보 업데이트에 실패했습니다."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>사용자 정보 수정</DialogTitle>
          <DialogDescription>
            사용자 정보를 수정하고 저장합니다.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col h-full"
          >
            {/* 스크롤 가능한 콘텐츠 영역 - 모바일에서 pb-60 적용 */}
            <div className="max-h-[calc(80vh-180px)] overflow-y-auto overflow-x-hidden px-6 scrollbar-hidden pb-4 md:pb-4 pb-60">
              <div className="space-y-4 py-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        이름<span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        휴대폰 번호<span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          {...field}
                          onChange={(e) => {
                            field.onChange(formatPhoneNumber(e.target.value));
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        성별<span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant={
                              field.value === "남" ? "default" : "outline"
                            }
                            onClick={() => field.onChange("남")}
                          >
                            남
                          </Button>
                          <Button
                            type="button"
                            variant={
                              field.value === "여" ? "default" : "outline"
                            }
                            onClick={() => field.onChange("여")}
                          >
                            여
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="birthDate"
                  render={() => (
                    <FormItem>
                      <FormLabel>
                        생년월일<span className="text-red-500">*</span>
                      </FormLabel>
                      <div className="flex gap-2">
                        <Select onValueChange={setBirthYear} value={birthYear}>
                          <SelectTrigger>
                            <SelectValue placeholder="년" />
                          </SelectTrigger>
                          <SelectContent
                            position="popper"
                            className="max-h-[300px]"
                          >
                            {years.map((year) => (
                              <SelectItem key={year} value={String(year)}>
                                {year}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          onValueChange={setBirthMonth}
                          value={birthMonth}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="월" />
                          </SelectTrigger>
                          <SelectContent
                            position="popper"
                            className="max-h-[300px]"
                          >
                            {months.map((month) => (
                              <SelectItem key={month} value={String(month)}>
                                {month}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select onValueChange={setBirthDay} value={birthDay}>
                          <SelectTrigger>
                            <SelectValue placeholder="일" />
                          </SelectTrigger>
                          <SelectContent
                            position="popper"
                            className="max-h-[300px]"
                          >
                            {days.map((day) => (
                              <SelectItem key={day} value={String(day)}>
                                {day}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="school"
                  render={() => (
                    <FormItem>
                      <FormLabel>
                        학교<span className="text-red-500">*</span>
                      </FormLabel>
                      <div className="flex items-center gap-2 whitespace-nowrap ">
                        <Select
                          onValueChange={setSchoolLevel}
                          value={schoolLevel}
                        >
                          <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="선택" />
                          </SelectTrigger>
                          <SelectContent>
                            {[
                              "초등학교",
                              "중학교",
                              "고등학교",
                              "대학교",
                              "해당없음",
                            ].map((level) => (
                              <SelectItem key={level} value={level}>
                                {level}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormControl>
                          <Input
                            placeholder="학교 이름 (예: 선덕, 자운)"
                            value={schoolName}
                            onChange={(e) => setSchoolName(e.target.value)}
                            disabled={
                              !schoolLevel || schoolLevel === "해당없음"
                            }
                          />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="personalInfoConsent"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>개인정보 수집 및 이용 동의 (선택)</FormLabel>
                        <FormDescription>
                          동의 시 맞춤형 서비스 제공에 활용될 수 있습니다.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Footer - 고정 위치 */}
            <DialogFooter className="px-6 pb-6 pt-4">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "저장 중..." : "저장"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
