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
import { rentItem, checkUserRentalStatus } from "@/lib/actions/rental";
import { addToWaitingList } from "@/lib/actions/waiting";
import {
  findUserByNameAndPhone,
  createGeneralUser,
} from "@/lib/actions/generalUser";
import { toast } from "sonner";
import { useForm, Resolver } from "react-hook-form";
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

type Step = "identification" | "register" | "success" | "waitingSuccess";

const identificationSchema = z
  .object({
    name: z.string().min(1, "이름을 입력해주세요."),
    phoneNumber: z.string().min(1, "휴대폰 번호를 입력해주세요."),
    maleCount: z.number().optional().default(0),
    femaleCount: z.number().optional().default(0),
  })
  .refine((data) => data.maleCount + data.femaleCount > 0, {
    message: "대여 인원은 최소 1명 이상이어야 합니다.",
    path: ["maleCount", "femaleCount"],
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
  const [countdown, setCountdown] = useState(5);
  const [waitingPosition, setWaitingPosition] = useState<number | null>(null);

  const isRentedMode = item?.status === "RENTED";
  const estimatedWaitingTime =
    ((item?.waitingCount ?? 0) + (isRentedMode ? 1 : 0)) * 15;

  const [birthYear, setBirthYear] = useState<string>();
  const [birthMonth, setBirthMonth] = useState<string>();
  const [birthDay, setBirthDay] = useState<string>();

  const [schoolLevel, setSchoolLevel] = useState("");
  const [schoolName, setSchoolName] = useState("");

  const [yearSelectOpen, setYearSelectOpen] = useState(false);

  const identificationForm = useForm<IdentificationFormValues>({
    resolver: zodResolver(
      identificationSchema
    ) as Resolver<IdentificationFormValues>,
    defaultValues: { name: "", phoneNumber: "", maleCount: 0, femaleCount: 0 },
  });

  const registerForm = useForm<GeneralUserFormValues>({
    resolver: zodResolver(generalUserSchema) as Resolver<GeneralUserFormValues>,
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
      registerForm.setValue(
        "birthDate",
        `${birthYear}-${birthMonth}-${birthDay}`
      );
    } else {
      registerForm.setValue("birthDate", "");
    }
  }, [birthYear, birthMonth, birthDay, registerForm]);

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
  }, [schoolLevel, schoolName, registerForm]);

  useEffect(() => {
    if (step === "success" || step === "waitingSuccess") {
      setCountdown(5);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            handleSuccessConfirm();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [step]);

  const handleIdentificationSubmit = async (
    values: IdentificationFormValues
  ) => {
    if (!item) return;
    setIsSubmitting(true);
    try {
      const user = await findUserByNameAndPhone(
        values.name,
        values.phoneNumber
      );
      if (user) {
        const status = await checkUserRentalStatus(user.id, item.id);
        if (status.error) {
          throw new Error(status.error);
        }
        if (status.isRenting) {
          toast.error("이미 대여 중인 아이템입니다.");
          return;
        }
        if (status.isWaiting) {
          toast.error("이미 대기열에 등록된 아이템입니다.");
          return;
        }

        if (isRentedMode) {
          await handleWaiting(user.id);
        } else {
          await handleRental(user.id, values.maleCount, values.femaleCount);
        }
      } else {
        toast.info("등록된 사용자가 아닙니다. 신규 등록을 진행해주세요.");
        setStep("register");
        registerForm.setValue("name", values.name);
        registerForm.setValue("phoneNumber", values.phoneNumber);
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "사용자 확인 중 오류가 발생했습니다."
      );
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
        if (isRentedMode) {
          await handleWaiting(result.user.id);
        } else {
          const { maleCount, femaleCount } = identificationForm.getValues();
          await handleRental(result.user.id, maleCount, femaleCount);
        }
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "사용자 등록에 실패했습니다."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRental = async (
    userId: number,
    maleCount: number,
    femaleCount: number
  ) => {
    if (!item) {
      toast.error("아이템 정보가 없습니다.");
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await rentItem(userId, item.id, maleCount, femaleCount);
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

  const handleWaiting = async (userId: number) => {
    if (!item) {
      toast.error("아이템 정보가 없습니다.");
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await addToWaitingList(userId, item.id);
      if (result.error) {
        throw new Error(result.error);
      }
      setWaitingPosition(result.waitingPosition ?? null);
      setStep("waitingSuccess");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "대기열 등록에 실패했습니다."
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
    setCountdown(5);
    setWaitingPosition(null);
    identificationForm.reset();
    registerForm.reset();
    setBirthYear(undefined);
    setBirthMonth(undefined);
    setBirthDay(undefined);
    setSchoolLevel("");
    setSchoolName("");
    setYearSelectOpen(false);
  };

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
                <DialogTitle className="text-2xl font-black text-[oklch(0.75_0.12_165)]">
                  {isRentedMode ? "대기열 등록" : "아이템 대여"}
                </DialogTitle>
                <DialogDescription>
                  {isRentedMode
                    ? `현재 '${item.name}'은(는) 대여 중입니다.`
                    : `'${item.name}'을(를) 대여하려면 이름과 휴대폰 번호를 입력하세요.`}
                </DialogDescription>
              </DialogHeader>

              {/* 대기자 명단 카드 */}
              {isRentedMode && (
                <div className="rounded-lg border border-[oklch(0.75_0.12_165/0.2)] bg-gradient-to-br from-[oklch(0.75_0.12_165/0.05)] to-[oklch(0.7_0.18_350/0.05)] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[oklch(0.7_0.18_350)] animate-pulse" />
                      <span className="text-sm font-semibold text-foreground">
                        현재 대기 현황
                      </span>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">
                      예상 대기시간 {estimatedWaitingTime}분
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <div className="flex items-baseline">
                      <span className="text-sm text-muted-foreground mr-1">
                        사용중
                      </span>
                      <span className="text-3xl font-black text-[oklch(0.75_0.12_165)]">
                        1
                      </span>
                      <span className="text-sm text-muted-foreground">팀</span>
                    </div>
                    <div className="flex items-baseline">
                      <span className="text-sm text-muted-foreground mr-1">
                        대기
                      </span>
                      <span className="text-3xl font-black text-[oklch(0.7_0.18_350)]">
                        {item.waitingCount}
                      </span>
                      <span className="text-sm text-muted-foreground">팀</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[oklch(0.75_0.12_165/0.1)]"></div>
                </div>
              )}

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
              <div className="flex gap-4">
                <FormField
                  control={identificationForm.control}
                  name="maleCount"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>남자 인원</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={field.value || ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === "") {
                              field.onChange(0);
                            } else {
                              const num = parseInt(value, 10);
                              field.onChange(isNaN(num) ? 0 : Math.max(0, num));
                            }
                          }}
                          onFocus={(e) => {
                            if (field.value === 0) {
                              e.target.value = "";
                            }
                          }}
                          onBlur={(e) => {
                            if (e.target.value === "") {
                              field.onChange(0);
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={identificationForm.control}
                  name="femaleCount"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>여자 인원</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={field.value || ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === "") {
                              field.onChange(0);
                            } else {
                              const num = parseInt(value, 10);
                              field.onChange(isNaN(num) ? 0 : Math.max(0, num));
                            }
                          }}
                          onFocus={(e) => {
                            if (field.value === 0) {
                              e.target.value = "";
                            }
                          }}
                          onBlur={(e) => {
                            if (e.target.value === "") {
                              field.onChange(0);
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter className="gap-2 sm:justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep("register")}
                  disabled={isSubmitting}
                  className="border-[oklch(0.75_0.12_165/0.3)] hover:bg-[oklch(0.75_0.12_165/0.1)]"
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
                  <Button
                    type="submit"
                    disabled={
                      isSubmitting || !identificationForm.formState.isValid
                    }
                    className="bg-[oklch(0.75_0.12_165)] hover:bg-[oklch(0.7_0.12_165)]"
                  >
                    {isSubmitting
                      ? "처리 중..."
                      : isRentedMode
                      ? "대기열 등록하기"
                      : "대여하기"}
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
                <DialogTitle className="text-2xl font-black text-[oklch(0.75_0.12_165)]">
                  사용자 등록
                </DialogTitle>
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
                      이름<span className="text-[oklch(0.7_0.18_350)]">*</span>
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
                      휴대폰 번호
                      <span className="text-[oklch(0.7_0.18_350)]">*</span>
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
                      성별<span className="text-[oklch(0.7_0.18_350)]">*</span>
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
                          className={
                            field.value === "남"
                              ? "bg-[oklch(0.75_0.12_165)] hover:bg-[oklch(0.7_0.12_165)]"
                              : "border-[oklch(0.75_0.12_165/0.3)] hover:bg-[oklch(0.75_0.12_165/0.1)]"
                          }
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
                          className={
                            field.value === "여"
                              ? "bg-[oklch(0.7_0.18_350)] hover:bg-[oklch(0.68_0.18_350)] text-white"
                              : "border-[oklch(0.7_0.18_350/0.3)] hover:bg-[oklch(0.7_0.18_350/0.1)]"
                          }
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
                      생년월일
                      <span className="text-[oklch(0.7_0.18_350)]">*</span>
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
                control={registerForm.control}
                name="school"
                render={() => (
                  <FormItem>
                    <FormLabel>
                      학교<span className="text-[oklch(0.7_0.18_350)]">*</span>
                    </FormLabel>
                    <div className="flex items-center gap-2">
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
                          disabled={!schoolLevel || schoolLevel === "해당없음"}
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={registerForm.control}
                name="personalInfoConsent"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-[oklch(0.75_0.12_165/0.2)] p-4">
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
                  className="bg-[oklch(0.75_0.12_165)] hover:bg-[oklch(0.7_0.12_165)]"
                >
                  {isSubmitting
                    ? "등록 중..."
                    : isRentedMode
                    ? "등록 및 대기"
                    : "등록 및 대여"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        );
      case "success":
        return (
          <div
            className="flex flex-col items-center justify-center py-12 px-8 text-center relative overflow-hidden"
            key="success"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.75_0.12_165/0.1)] via-[oklch(0.7_0.18_350/0.1)] to-[oklch(0.7_0.18_350/0.1)] animate-pulse" />

            <div className="absolute top-4 left-1/4 text-4xl animate-bounce">
              ✨
            </div>
            <div
              className="absolute top-14 right-1/4 text-3xl animate-bounce"
              style={{ animationDelay: "0.1s" }}
            >
              🎊
            </div>
            <div
              className="absolute bottom-24 left-1/3 text-2xl animate-bounce"
              style={{ animationDelay: "0.2s" }}
            >
              🎈
            </div>

            <div className="relative z-10 space-y-6">
              <div className="relative inline-block">
                <div className="text-8xl animate-bounce">🎉</div>
                <div
                  className="absolute -top-2 -right-2 text-3xl"
                  style={{ animation: "spin 3s linear infinite" }}
                >
                  ⭐
                </div>
              </div>

              <div className="space-y-2">
                <DialogTitle className="text-3xl font-black bg-gradient-to-r from-[oklch(0.75_0.12_165)] via-[oklch(0.7_0.18_350)] to-[oklch(0.7_0.18_350)] bg-clip-text text-transparent">
                  대여 완료!
                </DialogTitle>
                <div className="text-5xl font-bold text-[oklch(0.75_0.12_165)]">
                  {item.name}
                </div>
              </div>

              <DialogDescription className="text-lg font-medium text-foreground leading-relaxed">
                신나게 즐기고 <br />
                <span className="text-[oklch(0.7_0.18_350)] font-bold">
                  정리정돈
                </span>{" "}
                하는 거 잊지 말기!
              </DialogDescription>

              <div className="relative w-24 h-24 mx-auto my-6">
                <svg className="transform -rotate-90 w-24 h-24">
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="#e5e7eb"
                    strokeWidth="6"
                    fill="none"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="url(#gradient)"
                    strokeWidth="6"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 40}`}
                    strokeDashoffset={`${
                      2 * Math.PI * 40 * (1 - countdown / 5)
                    }`}
                    style={{
                      transition: "stroke-dashoffset 1s linear",
                    }}
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient
                      id="gradient"
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="100%"
                    >
                      <stop offset="0%" stopColor="oklch(0.75 0.12 165)" />
                      <stop offset="50%" stopColor="oklch(0.7 0.18 350)" />
                      <stop offset="100%" stopColor="oklch(0.7 0.18 350)" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-3xl font-black bg-gradient-to-r from-[oklch(0.75_0.12_165)] to-[oklch(0.7_0.18_350)] bg-clip-text text-transparent">
                    {countdown}
                  </span>
                </div>
              </div>

              <DialogFooter className="mt-6">
                <Button
                  onClick={handleSuccessConfirm}
                  className="w-full h-12 text-lg font-bold bg-gradient-to-r from-[oklch(0.75_0.12_165)] via-[oklch(0.7_0.18_350)] to-[oklch(0.7_0.18_350)] hover:from-[oklch(0.7_0.12_165)] hover:via-[oklch(0.65_0.18_350)] hover:to-[oklch(0.65_0.18_350)] transition-all duration-300 transform hover:scale-105 shadow-lg"
                >
                  확인 ✓
                </Button>
              </DialogFooter>

              <p className="text-xs text-muted-foreground mt-2">
                {countdown}초 후 자동으로 닫힙니다
              </p>
            </div>
          </div>
        );
      case "waitingSuccess":
        return (
          <div
            className="flex flex-col items-center justify-center py-12 px-8 text-center relative"
            key="waitingSuccess"
          >
            <div className="relative z-10 space-y-6">
              <DialogTitle className="text-3xl font-black text-[oklch(0.75_0.12_165)]">
                대기열 합류 완료!
              </DialogTitle>
              <DialogDescription className="text-lg font-medium text-foreground leading-relaxed">
                예약 리스트에 올랐어!
              </DialogDescription>

              <div className="my-8">
                <p className="text-base text-muted-foreground">너의 순서는</p>
                <p className="text-8xl font-black text-[oklch(0.7_0.18_350)] animate-pulse">
                  {waitingPosition}번째
                </p>
              </div>

              <DialogFooter className="mt-6">
                <Button
                  onClick={handleSuccessConfirm}
                  className="w-full h-12 text-lg font-bold bg-gradient-to-r from-[oklch(0.75_0.12_165)] to-[oklch(0.7_0.18_350)]"
                >
                  확인 ({countdown})
                </Button>
              </DialogFooter>
            </div>
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
