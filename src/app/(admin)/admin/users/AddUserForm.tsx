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
import { DialogFooter } from "@/components/ui/dialog";
import { createGeneralUser } from "@/lib/actions/generalUser";
import { generalUserSchema } from "@/lib/validators/generalUser";
import { useState, useEffect, useMemo } from "react";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileText, X } from "lucide-react";

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

export function AddUserForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [birthYear, setBirthYear] = useState<string>();
  const [birthMonth, setBirthMonth] = useState<string>();
  const [birthDay, setBirthDay] = useState<string>();

  const [schoolLevel, setSchoolLevel] = useState("");
  const [schoolName, setSchoolName] = useState("");

  const [yearSelectOpen, setYearSelectOpen] = useState(false);

  const [isConsentModalOpen, setIsConsentModalOpen] = useState(false);
  const [consentFileUrl, setConsentFileUrl] = useState<string | null>(null);
  const [consentFileType, setConsentFileType] = useState<
    "pdf" | "image" | "doc" | null
  >(null);

  const form = useForm<GeneralUserFormValues>({
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

  useEffect(() => {
    if (birthYear && birthMonth && birthDay) {
      form.setValue("birthDate", `${birthYear}-${birthMonth}-${birthDay}`);
    } else {
      form.setValue("birthDate", "");
    }
  }, [birthYear, birthMonth, birthDay, form.setValue]);

  useEffect(() => {
    if (schoolLevel === "해당없음") {
      form.setValue("school", "해당없음");
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
      const cleanedSchoolName = schoolName.trim().replace(/\s+/g, "");
      form.setValue("school", `${cleanedSchoolName}${suffix}`);
    } else {
      form.setValue("school", "");
    }
  }, [schoolLevel, schoolName, form.setValue]);

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

  useEffect(() => {
    const fetchConsentFile = async () => {
      try {
        const response = await fetch("/api/uploads/consent");
        if (response.ok) {
          const data = await response.json();
          const files = data.files || [];
          if (files.length > 0) {
            const fileName = files[0];
            const fileUrl = `/uploads/consent/${fileName}`;
            setConsentFileUrl(fileUrl);

            const ext = fileName.toLowerCase().split(".").pop();
            if (ext === "pdf") {
              setConsentFileType("pdf");
            } else if (
              ["jpg", "jpeg", "png", "webp", "gif"].includes(ext || "")
            ) {
              setConsentFileType("image");
            } else {
              setConsentFileType("doc");
            }
          }
        }
      } catch (error) {
        console.error("Error fetching consent file:", error);
      }
    };

    fetchConsentFile();
  }, []);

  const handleOpenConsentModal = () => {
    if (consentFileUrl) {
      setIsConsentModalOpen(true);
    } else {
      toast.error("동의서 파일을 불러올 수 없습니다.");
    }
  };

  async function onSubmit(values: GeneralUserFormValues) {
    setIsSubmitting(true);
    try {
      const result = await createGeneralUser(values);
      if (result.error) {
        throw new Error(result.error);
      }
      if (result.user) {
        toast.success("사용자가 성공적으로 추가되었습니다!");
        router.refresh();
        form.reset();
        setBirthYear(undefined);
        setBirthMonth(undefined);
        setBirthDay(undefined);
        setSchoolLevel("");
        setSchoolName("");
        setYearSelectOpen(false);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "사용자 등록에 실패했습니다."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const watchedValues = form.watch();
  const isButtonDisabled =
    !watchedValues.name ||
    !watchedValues.phoneNumber ||
    !watchedValues.gender ||
    !watchedValues.birthDate ||
    !watchedValues.school;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                이름<span className="text-red-500">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="홍길동"
                  {...field}
                  onChange={(e) =>
                    field.onChange(e.target.value.replace(/\s/g, ""))
                  }
                />
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
                    variant={field.value === "남" ? "default" : "outline"}
                    onClick={() => {
                      field.onChange("남");
                      form.trigger("gender");
                    }}
                    className="flex-1"
                  >
                    남
                  </Button>
                  <Button
                    type="button"
                    variant={field.value === "여" ? "default" : "outline"}
                    onClick={() => {
                      field.onChange("여");
                      form.trigger("gender");
                    }}
                    className="flex-1"
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
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="년" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="max-h-[300px]">
                    {years.map((year) => (
                      <SelectItem key={year} value={String(year)}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select onValueChange={setBirthMonth} value={birthMonth}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="월" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="max-h-[300px]">
                    {months.map((month) => (
                      <SelectItem key={month} value={String(month)}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select onValueChange={setBirthDay} value={birthDay}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="일" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="max-h-[300px]">
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
              <div className="flex items-center gap-2">
                <Select onValueChange={setSchoolLevel} value={schoolLevel}>
                  <SelectTrigger className="w-[140px]">
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
                    onChange={(e) =>
                      setSchoolName(e.target.value.replace(/\s/g, ""))
                    }
                    disabled={!schoolLevel || schoolLevel === "해당없음"}
                    className="flex-1"
                  />
                </FormControl>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 개선된 동의서 섹션 */}
        <FormField
          control={form.control}
          name="personalInfoConsent"
          render={({ field }) => (
            <FormItem className="rounded-lg border-2 border-dashed border-muted-foreground/30 p-4 bg-muted/10">
              <div className="flex items-start gap-3">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className="mt-1"
                  />
                </FormControl>
                <div className="flex-1 space-y-2">
                  <FormLabel className="text-base font-semibold leading-none">
                    개인정보 수집 및 이용 동의 (선택)
                  </FormLabel>
                  <FormDescription className="text-sm leading-relaxed">
                    동의 시 맞춤형 서비스 제공에 활용될 수 있습니다.
                    <br />
                    동의하지 않아도 서비스 이용이 가능합니다.
                  </FormDescription>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleOpenConsentModal}
                    className="mt-2 gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    동의서 보기
                  </Button>
                </div>
              </div>
            </FormItem>
          )}
        />

        <DialogFooter>
          <Button
            type="submit"
            disabled={isSubmitting || isButtonDisabled}
            className="w-full sm:w-auto"
          >
            {isSubmitting ? "등록 중..." : "사용자 추가"}
          </Button>
        </DialogFooter>
      </form>

      {/* 개선된 동의서 모달 */}
      <Dialog open={isConsentModalOpen} onOpenChange={setIsConsentModalOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-[oklch(0.75_0.12_165/0.1)] to-[oklch(0.7_0.18_350/0.1)]">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-2xl font-bold text-[oklch(0.75_0.12_165)]">
                개인정보 수집 및 이용 동의서
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-auto p-6 bg-muted/5">
            {!consentFileUrl && (
              <div className="flex flex-col items-center justify-center py-16 space-y-4">
                <FileText className="w-16 h-16 text-muted-foreground/50" />
                <p className="text-lg text-muted-foreground">
                  동의서 파일을 불러올 수 없습니다.
                </p>
              </div>
            )}

            {consentFileUrl && consentFileType === "pdf" && (
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <iframe
                  src={consentFileUrl}
                  className="w-full h-[calc(90vh-200px)] border-0"
                  title="개인정보 수집 및 이용 동의서"
                />
              </div>
            )}

            {consentFileUrl && consentFileType === "image" && (
              <div className="flex justify-center">
                <img
                  src={consentFileUrl}
                  alt="개인정보 수집 및 이용 동의서"
                  className="max-w-full h-auto rounded-lg shadow-md"
                />
              </div>
            )}

            {consentFileUrl && consentFileType === "doc" && (
              <div className="flex flex-col items-center justify-center space-y-6 py-16">
                <div className="p-6 bg-white rounded-full shadow-lg">
                  <FileText className="w-16 h-16 text-[oklch(0.75_0.12_165)]" />
                </div>
                <div className="text-center space-y-2">
                  <p className="text-lg font-semibold">문서 파일</p>
                  <p className="text-muted-foreground">
                    다운로드하여 확인하실 수 있습니다.
                  </p>
                </div>
                <Button asChild size="lg" className="gap-2">
                  <a
                    href={consentFileUrl}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <FileText className="w-5 h-5" />
                    동의서 다운로드
                  </a>
                </Button>
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t bg-muted/30">
            <Button
              onClick={() => setIsConsentModalOpen(false)}
              variant="outline"
              className="w-full"
            >
              닫기
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Form>
  );
}
