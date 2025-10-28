"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Item } from "@/app/(admin)/admin/items/columns";
import { rentItem } from "@/lib/actions/rental";
import {
  findUserByNameAndPhone,
  createGeneralUser,
} from "@/lib/actions/generalUser";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { generalUserSchema } from "@/lib/validators/generalUser";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface RentalDialogProps {
  item: Item | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = "identification" | "register" | "success";

const identificationSchema = z.object({
  name: z.string().min(1, "이름을 입력해주세요."),
  phoneNumber: z.string().min(1, "휴대폰 번호를 입력해주세요."),
});

type IdentificationFormValues = z.infer<typeof identificationSchema>;
type GeneralUserFormValues = z.infer<typeof generalUserSchema>;

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

export function RentalDialog({ item, open, onOpenChange }: RentalDialogProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("identification");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [peopleCount, setPeopleCount] = useState("1");

  // 생년월일 상태
  const [birthYear, setBirthYear] = useState<string>();
  const [birthMonth, setBirthMonth] = useState<string>();
  const [birthDay, setBirthDay] = useState<string>();

  // 학교 정보 상태
  const [schoolLevel, setSchoolLevel] = useState("");
  const [schoolName, setSchoolName] = useState("");

  // 년도 Select가 열렸을 때 2010년으로 스크롤
  const [yearSelectOpen, setYearSelectOpen] = useState(false);

  const identificationForm = useForm<IdentificationFormValues>({
    resolver: zodResolver(identificationSchema),
    defaultValues: { name: "", phoneNumber: "" },
  });

  const registerForm = useForm<GeneralUserFormValues>({
    resolver: zodResolver(generalUserSchema),
    defaultValues: {
      name: "",
      phoneNumber: "",
      gender: "",
      birthDate: "",
      school: "",
      personalInfoConsent: false,
    },
  });

  // 생년월일 useEffect (이것 하나만 남깁니다)
  useEffect(() => {
    if (birthYear && birthMonth && birthDay) {
      registerForm.setValue(
        "birthDate",
        `${birthYear}-${birthMonth}-${birthDay}`
      );
    } else {
      registerForm.setValue("birthDate", "");
    }
  }, [birthYear, birthMonth, birthDay, registerForm.setValue]);

  // 학교 useEffect (이것 하나만 남깁니다)
  useEffect(() => {
    if (schoolLevel === "해당없음") {
      registerForm.setValue("school", "해당없음");
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
      registerForm.setValue("school", `${schoolName}${suffix}`);
    } else {
      registerForm.setValue("school", "");
    }
  }, [schoolLevel, schoolName, registerForm.setValue]);

  const handleIdentificationSubmit = async (
    values: IdentificationFormValues
  ) => {
    setIsSubmitting(true);
    try {
      const user = await findUserByNameAndPhone(
        values.name,
        values.phoneNumber
      );
      if (user) {
        const count = Math.max(1, parseInt(peopleCount, 10) || 1);
        await handleRental(user.id, count);
      } else {
        toast.info("등록된 사용자가 아닙니다. 신규 등록을 진행해주세요.");
        setStep("register");
        registerForm.setValue("name", values.name);
        registerForm.setValue("phoneNumber", values.phoneNumber);
      }
    } catch (error) {
      toast.error("사용자 확인 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (values: GeneralUserFormValues) => {
    setIsSubmitting(true);
    try {
      const result = await createGeneralUser(values);
      if (result.error) {
        throw new Error(result.error);
      }
      if (result.user) {
        const count = Math.max(1, parseInt(peopleCount, 10) || 1);
        await handleRental(result.user.id, count);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "사용자 등록에 실패했습니다."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRental = async (userId: number, peopleCount: number) => {
    if (!item) {
      toast.error("아이템 정보가 없습니다.");
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await rentItem(userId, item.id, peopleCount);
      if (result.error) {
        throw new Error(result.error);
      }
      setStep("success");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "대여에 실패했습니다."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeDialog = () => {
    onOpenChange(false);
  };

  const handleSuccessConfirm = () => {
    resetDialog();
    closeDialog();
    router.refresh();
  };

  const resetDialog = () => {
    setStep("identification");
    identificationForm.reset();
    registerForm.reset();
    setBirthYear(undefined);
    setBirthMonth(undefined);
    setBirthDay(undefined);
    setSchoolLevel("");
    setSchoolName("");
    setYearSelectOpen(false);
    setPeopleCount("1");
  };

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    // 1930년부터 현재년도까지 (역순)
    return Array.from(
      { length: currentYear - 1929 },
      (_, i) => currentYear - i
    );
  }, []);

  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);

  const days = useMemo(() => {
    if (!birthYear || !birthMonth) {
      // 년/월이 선택 안됐으면 1~31일까지 기본 표시
      return Array.from({ length: 31 }, (_, i) => i + 1);
    }
    const daysInMonth = new Date(
      parseInt(birthYear),
      parseInt(birthMonth),
      0
    ).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }, [birthYear, birthMonth]);

  if (!item) return null;

  const renderStep = () => {
    switch (step) {
      case "identification":
        return (
          <Form {...identificationForm} key="identification">
            <form
              onSubmit={identificationForm.handleSubmit(
                handleIdentificationSubmit
              )}
              className="space-y-4"
            >
              <DialogHeader>
                <DialogTitle>아이템 대여</DialogTitle>
                <DialogDescription>
                  '{item.name}'을(를) 대여하려면 이름과 휴대폰 번호를
                  입력하세요.
                </DialogDescription>
              </DialogHeader>
              <FormField
                control={identificationForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>이름</FormLabel>
                    <FormControl>
                      <Input placeholder="홍길동" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={identificationForm.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>휴대폰 번호</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="010-1234-5678"
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
              <FormItem>
                <FormLabel>대여 인원</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="1"
                    value={peopleCount}
                    onChange={(e) => setPeopleCount(e.target.value)}
                    onBlur={(e) => {
                      const num = parseInt(e.target.value, 10);
                      if (isNaN(num) || num < 1) {
                        setPeopleCount("1");
                      }
                    }}
                  />
                </FormControl>
              </FormItem>
              <DialogFooter className="gap-2 sm:justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep("register")}
                  disabled={isSubmitting}
                >
                  신규 등록
                </Button>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={closeDialog}
                    disabled={isSubmitting}
                  >
                    취소
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "확인 중..." : "대여하기"}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </Form>
        );
      case "register":
        const watchedValues = registerForm.watch();
        const isButtonDisabled =
          !watchedValues.name ||
          !watchedValues.phoneNumber ||
          !watchedValues.gender ||
          !watchedValues.birthDate ||
          !watchedValues.school;
        return (
          <Form {...registerForm} key="register">
            <form
              onSubmit={registerForm.handleSubmit(handleRegisterSubmit)}
              className="space-y-4"
            >
              <DialogHeader>
                <DialogTitle>사용자 등록</DialogTitle>
                <DialogDescription>
                  새로운 사용자를 등록합니다. 정보를 입력해주세요.
                </DialogDescription>
              </DialogHeader>
              <FormField
                control={registerForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      이름<span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="홍길동" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={registerForm.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      휴대폰 번호<span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="010-1234-5678"
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
                control={registerForm.control}
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
                          variant={field.value === "남" ? "default" : "outline"}
                          onClick={() => {
                            field.onChange("남");
                            registerForm.trigger("gender");
                          }}
                        >
                          남
                        </Button>
                        <Button
                          type="button"
                          variant={field.value === "여" ? "default" : "outline"}
                          onClick={() => {
                            field.onChange("여");
                            registerForm.trigger("gender");
                          }}
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
                control={registerForm.control}
                name="birthDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      생년월일<span className="text-red-500">*</span>
                    </FormLabel>
                    <div className="flex gap-2">
                      <Select
                        onValueChange={setBirthYear}
                        value={birthYear}
                        open={yearSelectOpen}
                        onOpenChange={setYearSelectOpen}
                      >
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
                      <Select onValueChange={setBirthMonth} value={birthMonth}>
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
                // react-hook-form이 'school' 필드를 인지하게 합니다.
                // 실제 값은 useEffect를 통해 관리됩니다.
                control={registerForm.control}
                name="school"
                render={() => (
                  <FormItem>
                    <FormLabel>
                      학교<span className="text-red-500">*</span>
                    </FormLabel>
                    <div className="flex items-center gap-2">
                      {/* 학교 분류 선택 Select Box */}
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

                      {/* 학교 이름 입력 Input */}
                      <FormControl>
                        <Input
                          placeholder="학교 이름 (예: 선덕, 자운)"
                          value={schoolName}
                          onChange={(e) => setSchoolName(e.target.value)}
                          // '분류'를 선택하지 않았거나 '해당없음'을 선택하면 비활성화
                          disabled={!schoolLevel || schoolLevel === "해당없음"}
                        />
                      </FormControl>
                    </div>
                    {/* 유효성 검사 에러 메시지가 여기에 표시됩니다. */}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={registerForm.control}
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
                      {/* 👇 수정: 문구 변경 */}
                      <FormLabel>개인정보 수집 및 이용 동의 (선택)</FormLabel>
                      <FormDescription>
                        동의 시 맞춤형 서비스 제공에 활용될 수 있습니다.
                        동의하지 않아도 서비스 이용이 가능합니다.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setStep("identification")}
                  disabled={isSubmitting}
                >
                  뒤로
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || isButtonDisabled}
                >
                  {isSubmitting ? "등록 중..." : "등록 및 대여"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        );
      case "success":
        return (
          <div
            className="flex flex-col items-center justify-center p-8 text-center"
            key="success"
          >
            <div className="text-6xl mb-4">🎉</div>
            <DialogTitle className="text-2xl font-bold mb-2">
              대여 완료!
            </DialogTitle>
            <DialogDescription className="text-lg">
              '{item.name}' 신나게 즐기고 <br />
              반납하는 거 잊지 말기! 😉
            </DialogDescription>
            <DialogFooter className="mt-8">
              <Button onClick={handleSuccessConfirm} className="w-full">
                확인
              </Button>
            </DialogFooter>
          </div>
        );
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          resetDialog();
        }
        onOpenChange(isOpen);
      }}
    >
      <DialogContent onInteractOutside={(e) => e.preventDefault()}>
        {renderStep()}
      </DialogContent>
    </Dialog>
  );
}
