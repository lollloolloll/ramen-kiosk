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
import {
  rentItem,
  checkUserRentalStatus,
  getCurrentRenter,
} from "@/lib/actions/rental";
import {
  addToWaitingList,
  getWaitingListByItemId,
} from "@/lib/actions/waiting";
import {
  findUserByNameAndPhone,
  createGeneralUser,
} from "@/lib/actions/generalUser";
import { toast } from "sonner";
import { useForm, useFieldArray, Resolver } from "react-hook-form";
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
import { FileText, Minus, Plus, Users } from "lucide-react";

interface RentalDialogProps {
  item: Item | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  consentFile: { url: string; type: "pdf" | "image" | "doc" } | null;
}

type Step = "identification" | "register" | "success" | "waitingSuccess";

const identificationSchema = z
  .object({
    name: z.string().min(1, "이름을 입력해주세요."),
    phoneNumber: z.string().min(1, "휴대폰 번호를 입력해주세요."),
    maleCount: z.number().optional().default(0),
    femaleCount: z.number().optional().default(0),
    participants: z
      .array(
        z.object({
          name: z.string().min(1, "이름을 입력해주세요."),
          gender: z.enum(["남", "여"]),
        })
      )
      .optional()
      .default([]),
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

export function RentalDialog({
  item,
  open,
  onOpenChange,
  consentFile,
}: RentalDialogProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("identification");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [waitingPosition, setWaitingPosition] = useState<number | null>(null);
  const [showWaitingList, setShowWaitingList] = useState(false);
  const [waitingList, setWaitingList] = useState<
    Array<{
      id: number;
      userId: number | null;
      requestDate: number | null;
      userName: string | null;
      maleCount: number;
      femaleCount: number;
      position: number;
    }>
  >([]);
  const [isLoadingWaitingList, setIsLoadingWaitingList] = useState(false);
  const [isConsentModalOpen, setIsConsentModalOpen] = useState(false);
  const [tempConsent, setTempConsent] = useState(false);
  const [currentRenter, setCurrentRenter] = useState<{
    userName: string | null;
    rentalDate: number | null; // DB 타입에 따라 Date 또는 number
    returnDueDate: number | null;
    maleCount: number;
    femaleCount: number;
  } | null>(null);

  const isRentedMode = item?.isTimeLimited && item?.status === "RENTED";
  const estimatedWaitingTime = useMemo(() => {
    if (!item || !item.isTimeLimited || !item.rentalTimeMinutes) {
      return 0;
    }

    const waitingCount = item.waitingCount ?? 0;
    const rentalTime = item.rentalTimeMinutes;

    const waitingTimeForQueue = waitingCount * rentalTime;

    let remainingTimeForCurrentRental = 0;
    if (item.status === "RENTED" && item.returnDueDate) {
      const nowInSeconds = Math.floor(Date.now() / 1000);
      const remainingSeconds = item.returnDueDate - nowInSeconds;

      if (remainingSeconds > 0) {
        remainingTimeForCurrentRental = Math.ceil(remainingSeconds / 60);
      }
    }

    return remainingTimeForCurrentRental + waitingTimeForQueue;
  }, [item]);

  const [birthYear, setBirthYear] = useState<string>();
  const [birthMonth, setBirthMonth] = useState<string>();
  const [birthDay, setBirthDay] = useState<string>();

  const [schoolLevel, setSchoolLevel] = useState("");
  const [schoolName, setSchoolName] = useState("");

  const [yearSelectOpen, setYearSelectOpen] = useState(false);

  // const isMobileOrTablet =
  //   typeof window !== "undefined" &&
  //   ("ontouchstart" in window || navigator.maxTouchPoints > 0);

  const identificationForm = useForm<IdentificationFormValues>({
    resolver: zodResolver(
      identificationSchema
    ) as Resolver<IdentificationFormValues>,
    defaultValues: {
      name: "",
      phoneNumber: "",
      maleCount: 0,
      femaleCount: 0,
      participants: [],
    },
  });

  const { fields, replace } = useFieldArray({
    control: identificationForm.control,
    name: "participants",
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

  const maleCount = identificationForm.watch("maleCount") ?? 0;
  const femaleCount = identificationForm.watch("femaleCount") ?? 0;

  useEffect(() => {
    if (!item?.enableParticipantTracking) {
      replace([]);
      return;
    }

    const currentParticipants = identificationForm.getValues("participants");

    // 성별별로 기존 참가자 분리
    const existingMales = currentParticipants.filter((p) => p.gender === "남");
    const existingFemales = currentParticipants.filter(
      (p) => p.gender === "여"
    );

    const newParticipants: Array<{ name: string; gender: "남" | "여" }> = [];

    // 남자 참가자 - 기존 값 유지하고 부족하면 빈 값 추가
    for (let i = 0; i < maleCount; i++) {
      newParticipants.push(existingMales[i] || { name: "", gender: "남" });
    }

    // 여자 참가자 - 기존 값 유지하고 부족하면 빈 값 추가
    for (let i = 0; i < femaleCount; i++) {
      newParticipants.push(existingFemales[i] || { name: "", gender: "여" });
    }

    replace(newParticipants);
  }, [
    maleCount,
    femaleCount,
    item?.enableParticipantTracking,
    replace,
    identificationForm,
  ]);

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

    if (item.enableParticipantTracking && values.participants) {
      const hasEmptyName = values.participants.some(
        (p) => !p.name || p.name.trim().length === 0
      );
      if (hasEmptyName) {
        toast.error("모든 참여자의 이름을 입력해주세요.");
        return;
      }
    }

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
          await handleWaiting(user.id, values.maleCount, values.femaleCount);
        } else {
          await handleRental(
            user.id,
            values.maleCount,
            values.femaleCount,
            values.participants
          );
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
        toast.success("회원가입이 완료되었습니다.");

        identificationForm.setValue("name", values.name, {
          shouldValidate: true,
        });
        identificationForm.setValue("phoneNumber", values.phoneNumber, {
          shouldValidate: true,
        });

        setStep("identification");
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
    femaleCount: number,
    participants?: Array<{ name: string; gender: "남" | "여" }>
  ) => {
    if (!item) {
      toast.error("아이템 정보가 없습니다.");
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await rentItem(
        userId,
        item.id,
        maleCount,
        femaleCount,
        participants
      );
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

  const handleWaiting = async (
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
      const result = await addToWaitingList(
        userId,
        item.id,
        maleCount,
        femaleCount
      );
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
    setShowWaitingList(false);
    setWaitingList([]);
    identificationForm.reset();
    registerForm.reset();
    setBirthYear(undefined);
    setBirthMonth(undefined);
    setBirthDay(undefined);
    setSchoolLevel("");
    setSchoolName("");
    setYearSelectOpen(false);
    setIsConsentModalOpen(false);
    setTempConsent(false);
  };

  const handleWaitingListClick = async () => {
    if (!item) return;

    // 이미 열려있으면 닫기
    if (showWaitingList) {
      setShowWaitingList(false);
      return;
    }

    setIsLoadingWaitingList(true);
    try {
      // 1. 대기자 명단 불러오기 (기존 로직)
      const waitingResult = await getWaitingListByItemId(item.id);

      // 2. [추가] 현재 대여자 정보 불러오기
      const renterResult = await getCurrentRenter(item.id);

      if (waitingResult.error) {
        toast.error(waitingResult.error);
        return;
      }

      if (waitingResult.data) {
        setWaitingList(waitingResult.data);
      }

      // 현재 대여자 정보 설정
      if (renterResult.success && renterResult.data) {
        // DB에서 가져온 날짜 타입이 string/Date/number 인지 확인 필요 (여기선 number/Date 가정)
        // drizzle-sqlite에서 timestamp 모드에 따라 다름. 여기선 그대로 넣음.
        setCurrentRenter(renterResult.data as any);
      } else {
        setCurrentRenter(null);
      }

      setShowWaitingList(true);
    } catch (error) {
      toast.error("정보를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setIsLoadingWaitingList(false);
    }
  };

  const handleOpenConsentModal = () => {
    if (consentFile) {
      const currentConsent = registerForm.getValues("personalInfoConsent");
      setTempConsent(currentConsent === true);
      setIsConsentModalOpen(true);
    } else {
      toast.error("동의서 파일을 불러올 수 없습니다.");
    }
  };

  const handleConsentConfirm = () => {
    registerForm.setValue("personalInfoConsent", tempConsent);
    setIsConsentModalOpen(false);
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
    const content = (() => {
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
                    {isRentedMode
                      ? `${item.name} 대기열 등록`
                      : `${item.name} 대여`}
                  </DialogTitle>
                  <DialogDescription>
                    {isRentedMode
                      ? `현재 '${item.name}'은(는) 대여 중입니다.`
                      : `'${item.name}'을(를) 대여하려면 이름과 휴대폰 번호를 입력하세요.`}
                  </DialogDescription>
                </DialogHeader>

                {/* 대기열 현황 카드 (대여 중일 때만 표시) */}
                {isRentedMode && (
                  <div className="space-y-3">
                    {/* 현황 요약 카드 (클릭하여 펼치기) */}
                    <div
                      className="rounded-lg border border-[oklch(0.75_0.12_165/0.2)] bg-linear-to-br from-[oklch(0.75_0.12_165/0.05)] to-[oklch(0.7_0.18_350/0.05)] p-4 space-y-3 cursor-pointer hover:from-[oklch(0.75_0.12_165/0.1)] hover:to-[oklch(0.7_0.18_350/0.1)] transition-colors"
                      onClick={handleWaitingListClick}
                    >
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

                      <div className="flex items-baseline gap-4">
                        <div className="flex items-baseline gap-1">
                          <span className="text-sm text-muted-foreground">
                            사용중
                          </span>
                          <span className="text-2xl font-black text-[oklch(0.75_0.12_165)]">
                            1
                          </span>
                          <span className="text-xs text-muted-foreground">
                            팀
                          </span>
                        </div>
                        <div className="w-px h-8 bg-gray-200" />
                        <div className="flex items-baseline gap-1">
                          <span className="text-sm text-muted-foreground">
                            대기
                          </span>
                          <span className="text-2xl font-black text-[oklch(0.7_0.18_350)]">
                            {item.waitingCount || 0}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            팀
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-[oklch(0.75_0.12_165/0.1)] flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          터치하여 상세 정보 {showWaitingList ? "닫기" : "보기"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {showWaitingList ? "▲" : "▼"}
                        </span>
                      </div>
                    </div>

                    {/* [수정됨] 상세 정보 영역 (현재 사용자 + 대기자 명단) */}
                    {showWaitingList && (
                      <div className="rounded-lg border border-[oklch(0.75_0.12_165/0.2)] bg-white overflow-hidden shadow-sm animate-in slide-in-from-top-2 duration-200">
                        {isLoadingWaitingList ? (
                          <div className="text-center py-6 text-sm text-muted-foreground flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-[oklch(0.75_0.12_165)] border-t-transparent rounded-full animate-spin" />
                            정보 불러오는 중...
                          </div>
                        ) : (
                          <>
                            {/* 1. 현재 사용자 섹션 (Highlight) */}
                            {currentRenter && (
                              <div className="bg-[oklch(0.75_0.12_165/0.1)] p-3 border-b border-[oklch(0.75_0.12_165/0.1)]">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="bg-[oklch(0.75_0.12_165)] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                    현재 사용 중
                                  </span>
                                  {currentRenter.returnDueDate && (
                                    <span className="text-[10px] text-[oklch(0.7_0.18_350)] font-semibold ml-auto">
                                      {/* 남은 시간 계산 로직 필요 (여기선 단순 예시) */}
                                      반납 예정:{" "}
                                      {new Date(
                                        currentRenter.returnDueDate * 1000
                                      ).toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-base font-bold text-gray-800">
                                    {currentRenter.userName || "익명 사용자"}
                                  </span>
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs bg-white/60 px-1.5 py-0.5 rounded text-gray-600 border border-black/5">
                                      남 {currentRenter.maleCount}
                                    </span>
                                    <span className="text-xs bg-white/60 px-1.5 py-0.5 rounded text-gray-600 border border-black/5">
                                      여 {currentRenter.femaleCount}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* 2. 대기자 명단 섹션 */}
                            <div className="bg-gray-50/50">
                              <div className="px-3 py-2 text-xs font-semibold text-muted-foreground border-b flex justify-between bg-gray-100/50">
                                <span>대기 순서</span>
                                <span>대기자 ({waitingList.length}팀)</span>
                              </div>

                              <div className="max-h-[200px] overflow-y-auto p-2 space-y-1">
                                {waitingList.length === 0 ? (
                                  <div className="text-center py-8 text-sm text-gray-400">
                                    대기자가 없습니다.
                                    <br />
                                    <span className="text-xs">
                                      다음 순서로 바로 이용 가능해요!
                                    </span>
                                  </div>
                                ) : (
                                  waitingList.map((entry) => (
                                    <div
                                      key={entry.id}
                                      className="flex items-center gap-3 p-2.5 rounded-md bg-white border border-gray-100 shadow-sm"
                                    >
                                      <div className="shrink-0 w-6 h-6 rounded-full bg-[oklch(0.7_0.18_350)] text-white flex items-center justify-center text-xs font-bold">
                                        {entry.position}
                                      </div>
                                      <div className="flex flex-col flex-1">
                                        <div className="flex items-center justify-between">
                                          <span className="text-sm font-semibold text-gray-700">
                                            {entry.userName}
                                          </span>
                                        </div>
                                        <div className="text-[10px] text-gray-400 flex gap-1 mt-0.5">
                                          <span>남 {entry.maleCount}</span>
                                          <span className="text-gray-300">
                                            |
                                          </span>
                                          <span>여 {entry.femaleCount}</span>
                                        </div>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <FormField
                  control={identificationForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>이름</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="홍길동"
                          {...field}
                          className="focus-visible:outline-none! focus-visible:ring-0! focus-visible:ring-offset-0! focus-visible:border-2! focus-visible:border-[oklch(0.75_0.12_165)]!"
                        />
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
                          className="focus-visible:outline-none! focus-visible:ring-0! focus-visible:ring-offset-0! focus-visible:border-2! focus-visible:border-[oklch(0.75_0.12_165)]!"
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
                  {[
                    { name: "maleCount", label: "남자 인원" },
                    { name: "femaleCount", label: "여자 인원" },
                  ].map((item) => (
                    <FormField
                      key={item.name}
                      control={identificationForm.control}
                      name={item.name as "maleCount" | "femaleCount"}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel>{item.label}</FormLabel>
                          <FormControl>
                            <div className="flex items-center rounded-md border border-input bg-background p-1">
                              {/* 감소 버튼 */}
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0 rounded-sm hover:bg-slate-100"
                                onClick={() =>
                                  field.onChange(
                                    Math.max(0, (field.value || 0) - 1)
                                  )
                                }
                                disabled={!field.value || field.value <= 0}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>

                              {/* 숫자 표시 (읽기 전용 입력창) */}
                              <Input
                                {...field}
                                type="number"
                                readOnly
                                className="h-8 flex-1 border-0 bg-transparent text-center focus-visible:ring-0 shadow-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />

                              {/* 증가 버튼 */}
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0 rounded-sm hover:bg-slate-100"
                                onClick={() =>
                                  field.onChange((field.value || 0) + 1)
                                }
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>

                {/* 참가자 이름 입력 필드 (enableParticipantTracking 활성화 시) */}
                {item.enableParticipantTracking && fields.length > 0 && (
                  <div className="space-y-3 pt-4 border-t border-dashed">
                    <div className="flex items-center justify-between">
                      <FormLabel className="flex items-center gap-2 font-semibold">
                        <Users className="w-4 h-4" />
                        함께하는 친구들 이름
                      </FormLabel>
                      <span className="text-xs font-medium bg-red-50 text-red-500 px-2 py-0.5 rounded-full">
                        필수
                      </span>
                    </div>
                    <FormDescription className="text-xs">
                      참여하는 친구들의 이름을 모두 입력해주세요.
                    </FormDescription>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-5 max-h-48 overflow-y-auto pr-1 pt-3 pl-1">
                      {fields.map((field, index) => {
                        const genderLabel =
                          field.gender === "남" ? "남자" : "여자";
                        const genderIndex =
                          fields
                            .slice(0, index)
                            .filter((f) => f.gender === field.gender).length +
                          1;

                        return (
                          <FormField
                            key={field.id}
                            control={identificationForm.control}
                            name={`participants.${index}.name`}
                            render={({ field: nameField }) => (
                              <FormItem className="relative bg-gray-50 p-2 rounded-lg border">
                                <span
                                  className={`absolute -top-2.5 left-2 text-[10px] px-2 py-0.5 rounded-full font-bold text-white shadow-sm z-10 ${
                                    field.gender === "남"
                                      ? "bg-blue-400"
                                      : "bg-pink-400"
                                  }`}
                                >
                                  {genderLabel} {genderIndex}
                                </span>
                                <FormControl>
                                  <Input
                                    {...nameField}
                                    placeholder="이름"
                                    className="h-8 mt-1 text-sm bg-white focus-visible:border-[oklch(0.75_0.12_165)]"
                                  />
                                </FormControl>
                                <FormMessage className="text-[10px]" />
                              </FormItem>
                            )}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                <DialogFooter className="gap-2 sm:justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      // 1. 현재 identificationForm에 입력된 값을 가져옵니다.
                      const currentValues = identificationForm.getValues();

                      // 2. 단계 변경
                      setStep("register");

                      // 3. 가져온 값을 회원가입 폼(registerForm)에 넣어줍니다.
                      registerForm.setValue("name", currentValues.name);
                      registerForm.setValue(
                        "phoneNumber",
                        currentValues.phoneNumber
                      );
                    }}
                    disabled={isSubmitting}
                    className="border-[oklch(0.75_0.12_165/0.3)] text-gray-600 hover:bg-[oklch(0.75_0.12_165/0.05)]"
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
                      className="bg-[oklch(0.75_0.12_165)] hover:bg-[oklch(0.7_0.12_165)] text-white shadow-sm"
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
                        이름
                        <span className="text-[oklch(0.7_0.18_350)]">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="홍길동"
                          {...field}
                          className="focus-visible:outline-none! focus-visible:ring-0! focus-visible:ring-offset-0! focus-visible:border-2! focus-visible:border-[oklch(0.75_0.12_165)]!"
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
                          className="focus-visible:outline-none! focus-visible:ring-0! focus-visible:ring-offset-0! focus-visible:border-2! focus-visible:border-[oklch(0.75_0.12_165)]!"
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
                        성별
                        <span className="text-[oklch(0.7_0.18_350)]">*</span>
                      </FormLabel>
                      <FormControl>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant={
                              field.value === "남" ? "default" : "outline"
                            }
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
                            variant={
                              field.value === "여" ? "default" : "outline"
                            }
                            onClick={() => {
                              field.onChange("여");
                              registerForm.trigger("gender");
                            }}
                            className={
                              field.value === "여"
                                ? " bg-[oklch(0.7_0.18_350)] hover:bg-[oklch(0.68_0.18_350)] text-white"
                                : " border-[oklch(0.7_0.18_350/0.3)] hover:bg-[oklch(0.7_0.18_350/0.1)]"
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
                          <SelectTrigger className="focus:outline-none! focus:ring-0! focus:ring-offset-0! focus:border-2! focus:border-[oklch(0.75_0.12_165)]! data-[state=open]:border-2! data-[state=open]:border-[oklch(0.75_0.12_165)]!">
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
                          <SelectTrigger className="focus:outline-none! focus:ring-0! focus:ring-offset-0! focus:border-2! focus:border-[oklch(0.75_0.12_165)]! data-[state=open]:border-2! data-[state=open]:border-[oklch(0.75_0.12_165)]!">
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
                          <SelectTrigger className="focus:outline-none! focus:ring-0! focus:ring-offset-0! focus:border-2! focus:border-[oklch(0.75_0.12_165)]! data-[state=open]:border-2! data-[state=open]:border-[oklch(0.75_0.12_165)]!">
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
                        학교
                        <span className="text-[oklch(0.7_0.18_350)]">*</span>
                      </FormLabel>
                      <div className="flex items-center gap-2">
                        <Select
                          onValueChange={setSchoolLevel}
                          value={schoolLevel}
                        >
                          <SelectTrigger className="w-[120px] focus:outline-none! focus:ring-0! focus:ring-offset-0! focus:border-2! focus:border-[oklch(0.75_0.12_165)]! data-[state=open]:border-2! data-[state=open]:border-[oklch(0.75_0.12_165)]! ">
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
                            className="focus-visible:outline-none! focus-visible:ring-0! focus-visible:ring-offset-0! focus-visible:border-2! focus-visible:border-[oklch(0.75_0.12_165)]!"
                            onChange={(e) =>
                              setSchoolName(e.target.value.replace(/\s/g, ""))
                            }
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
                  control={registerForm.control}
                  name="personalInfoConsent"
                  render={({ field }) => (
                    <FormItem className="rounded-lg border-2 border-dashed border-[oklch(0.75_0.12_165/0.3)] p-4 bg-linear-to-br from-[oklch(0.75_0.12_165/0.05)] to-[oklch(0.7_0.18_350/0.05)]">
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={(checked) => {
                              field.onChange(checked === true);
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <div
                          className="flex-1 space-y-2 cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={handleOpenConsentModal}
                        >
                          <FormLabel className="text-base font-semibold leading-none cursor-pointer">
                            개인정보 수집 및 이용 동의 (선택)
                          </FormLabel>
                          <FormDescription className="text-sm leading-relaxed">
                            동의 시 맞춤형 서비스 제공에 활용될 수 있습니다.
                            <br />
                            동의하지 않아도 서비스 이용이 가능합니다.
                            <br />
                            <span className="text-[oklch(0.75_0.12_165)] font-medium">
                              클릭하여 동의서 확인 및 선택
                            </span>
                          </FormDescription>
                        </div>
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
                      ? "등록"
                      : "등록"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          );
        case "success":
          // 성공 화면용 원 둘레 계산 (반지름 40)
          const rSuccess = 40;
          const cSuccess = 2 * Math.PI * rSuccess;

          return (
            <div
              className="flex flex-col items-center justify-center w-full min-h-[500px] py-12 px-8 text-center relative overflow-hidden bg-white"
              key="success"
            >
              {/* 배경 그라데이션 */}
              <div className="absolute inset-0 bg-linear-to-br from-[oklch(0.75_0.12_165/0.1)] via-[oklch(0.7_0.18_350/0.1)] to-[oklch(0.7_0.18_350/0.1)] animate-pulse" />

              {/* 이모지 장식 */}
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

              <div className="relative z-10 space-y-6 w-full">
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
                  <DialogTitle className="text-3xl font-black bg-linear-to-r from-[oklch(0.75_0.12_165)] via-[oklch(0.7_0.18_350)] to-[oklch(0.7_0.18_350)] bg-clip-text text-transparent">
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

                {/* 싱크가 맞는 원형 카운트다운 (Success용) */}
                <div className="relative w-24 h-24 mx-auto my-6">
                  <svg className="transform -rotate-90 w-24 h-24">
                    <circle
                      cx="48"
                      cy="48"
                      r={rSuccess}
                      stroke="#e5e7eb"
                      strokeWidth="6"
                      fill="none"
                    />
                    <circle
                      cx="48"
                      cy="48"
                      r={rSuccess}
                      stroke="url(#gradient)"
                      strokeWidth="6"
                      fill="none"
                      strokeDasharray={cSuccess}
                      strokeDashoffset={0}
                      strokeLinecap="round"
                      style={{
                        animation: "countdown-ring 5s linear forwards",
                      }}
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
                    <span className="text-3xl font-black bg-linear-to-r from-[oklch(0.75_0.12_165)] to-[oklch(0.7_0.18_350)] bg-clip-text text-transparent tabular-nums">
                      {countdown}
                    </span>
                  </div>
                </div>

                <DialogFooter className="mt-6 w-full">
                  <Button
                    onClick={handleSuccessConfirm}
                    className="w-full h-12 text-lg font-bold bg-linear-to-r from-[oklch(0.75_0.12_165)] via-[oklch(0.7_0.18_350)] to-[oklch(0.7_0.18_350)] hover:from-[oklch(0.7_0.12_165)] hover:via-[oklch(0.65_0.18_350)] hover:to-[oklch(0.65_0.18_350)] transition-all duration-300 transform hover:scale-105 shadow-lg text-white border-0"
                  >
                    확인 ✓
                  </Button>
                </DialogFooter>

                <p className="text-xs text-muted-foreground mt-2">
                  {countdown}초 후 자동으로 닫힙니다
                </p>
              </div>
              {/* 애니메이션 키프레임 정의 */}
              <style jsx>{`
                @keyframes countdown-ring {
                  from {
                    stroke-dashoffset: 0;
                  }
                  to {
                    stroke-dashoffset: ${cSuccess};
                  }
                }
              `}</style>
            </div>
          );

        case "waitingSuccess":
          // 대기열 화면용 원 둘레 계산 (동일하게 설정)
          const rWait = 40;
          const cWait = 2 * Math.PI * rWait;

          return (
            <div
              className="relative flex flex-col items-center justify-center w-full min-h-[500px] overflow-hidden bg-white"
              key="waitingSuccess"
            >
              {/* 1. 배경 그라데이션 (깔끔한 버전) */}
              <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-linear-to-br from-[oklch(0.75_0.12_165/0.2)] via-[oklch(0.7_0.18_350/0.15)] to-[oklch(0.65_0.2_350/0.15)] animate-pulse" />
                <div
                  className="absolute inset-0 bg-linear-to-tr from-transparent via-[oklch(0.75_0.12_165/0.1)] to-transparent animate-pulse"
                  style={{ animationDelay: "1s", animationDuration: "3s" }}
                />
              </div>

              {/* 2. 컨텐츠 영역 */}
              <div className="relative z-10 flex flex-col items-center justify-center w-full h-full p-8 backdrop-blur-[2px]">
                {/* 싱크가 맞는 원형 카운트다운 (Waiting용) */}
                <div className="relative flex items-center justify-center w-40 h-40 mb-8">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="50%"
                      cy="50%"
                      r={rWait}
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      className="text-gray-100"
                    />
                    <circle
                      cx="50%"
                      cy="50%"
                      r={rWait}
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray={cWait}
                      strokeDashoffset={0}
                      strokeLinecap="round"
                      className="text-[oklch(0.7_0.18_350)]"
                      style={{
                        animation: "countdown-ring-wait 5s linear forwards",
                      }}
                    />
                  </svg>

                  {/* 중앙 대기 번호 */}
                  <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <div className="text-center animate-in zoom-in duration-300">
                      <span className="text-xs text-muted-foreground font-semibold block mb-1">
                        대기번호
                      </span>
                      <span className="text-4xl font-black text-[oklch(0.7_0.18_350)]">
                        {waitingPosition}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 텍스트 메시지 */}
                <div className="space-y-3 text-center mb-8">
                  <DialogTitle className="text-3xl font-black text-gray-800">
                    대기열 등록 완료!
                  </DialogTitle>

                  <DialogDescription className="text-lg text-gray-600 leading-relaxed font-medium">
                    예약 리스트에 등록되었습니다.
                    <br />
                    순서가 되면 알려드릴게요!
                  </DialogDescription>
                </div>

                {/* 하단 버튼 */}
                <div className="w-full space-y-3">
                  <Button
                    onClick={handleSuccessConfirm}
                    className="w-full h-12 text-lg font-bold text-white bg-linear-to-r from-[oklch(0.75_0.12_165)] to-[oklch(0.7_0.18_350)] hover:opacity-90 shadow-lg transform transition-transform hover:scale-[1.02]"
                  >
                    확인하러 가기
                  </Button>
                  <p className="text-xs text-center text-gray-500 font-medium">
                    {countdown}초 후 자동으로 이동합니다
                  </p>
                </div>
              </div>
              {/* 애니메이션 키프레임 정의 (Wait용) */}
              <style jsx>{`
                @keyframes countdown-ring-wait {
                  from {
                    stroke-dashoffset: 0;
                  }
                  to {
                    stroke-dashoffset: ${cWait};
                  }
                }
              `}</style>
            </div>
          );

        case "waitingSuccess":
          const isWaiting = step === "waitingSuccess";
          // 반지름과 둘레 계산
          const r = 40;
          const c = 2 * Math.PI * r;

          return (
            <div
              // key에 step을 넣어 모달이 열릴 때마다 애니메이션이 새로 시작되도록 함
              key={step}
              className="relative flex flex-col items-center justify-center w-full min-h-[500px] overflow-hidden bg-white"
            >
              {/* 1. 배경 그라데이션 */}
              <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-linear-to-br from-[oklch(0.75_0.12_165/0.2)] via-[oklch(0.7_0.18_350/0.15)] to-[oklch(0.65_0.2_350/0.15)] animate-pulse" />
                <div
                  className="absolute inset-0 bg-linear-to-tr from-transparent via-[oklch(0.75_0.12_165/0.1)] to-transparent animate-pulse"
                  style={{ animationDelay: "1s", animationDuration: "3s" }}
                />
              </div>

              {/* 2. 컨텐츠 영역 */}
              <div className="relative z-10 flex flex-col items-center justify-center w-full h-full p-8 backdrop-blur-[2px]">
                {/* 카운트다운 원형 UI */}
                <div className="relative flex items-center justify-center w-40 h-40 mb-8">
                  <svg className="w-full h-full transform -rotate-90">
                    {/* 배경 트랙 */}
                    <circle
                      cx="50%"
                      cy="50%"
                      r={r}
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      className="text-gray-100"
                    />
                    {/* 진행바 (CSS Animation 사용) */}
                    <circle
                      cx="50%"
                      cy="50%"
                      r={r}
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray={c}
                      strokeDashoffset={0} /* 시작은 꽉 찬 상태 */
                      strokeLinecap="round"
                      className="text-[oklch(0.7_0.18_350)]"
                      style={{
                        // 5초 동안 선형(linear)으로 정확하게 줄어들도록 설정
                        animation: `countdown-ring 5s linear forwards`,
                      }}
                    />
                    {/* CSS Keyframes 정의 (이 컴포넌트 내부에서만 동작) */}
                    <style jsx>{`
                      @keyframes countdown-ring {
                        from {
                          stroke-dashoffset: 0;
                        }
                        to {
                          stroke-dashoffset: ${c};
                        }
                      }
                    `}</style>
                  </svg>

                  {/* 중앙 숫자/텍스트 */}
                  <div className="absolute inset-0 flex items-center justify-center flex-col">
                    {isWaiting ? (
                      <div className="text-center animate-in zoom-in duration-300">
                        <span className="text-xs text-muted-foreground font-semibold block mb-1">
                          대기번호
                        </span>
                        <span className="text-4xl font-black text-[oklch(0.7_0.18_350)]">
                          {waitingPosition}
                        </span>
                      </div>
                    ) : (
                      <span className="text-5xl font-black text-[oklch(0.7_0.18_350)] tabular-nums animate-in zoom-in duration-300">
                        {countdown}
                      </span>
                    )}
                  </div>
                </div>

                {/* 메시지 영역 */}
                <div className="space-y-3 text-center mb-8">
                  <DialogTitle className="text-3xl font-black text-gray-800">
                    {isWaiting ? "대기열 등록 완료!" : "대여 완료!"}
                  </DialogTitle>

                  <DialogDescription className="text-lg text-gray-600 leading-relaxed font-medium">
                    {isWaiting ? (
                      <>
                        예약 리스트에 등록되었습니다.
                        <br />
                        순서가 되면 알려드릴게요!
                      </>
                    ) : (
                      <>
                        <span className="text-[oklch(0.75_0.12_165)] font-bold">
                          {item.name}
                        </span>{" "}
                        대여가
                        <br />
                        성공적으로 처리되었습니다.
                      </>
                    )}
                  </DialogDescription>
                </div>

                {/* 버튼 영역 */}
                <div className="w-full space-y-3">
                  <Button
                    onClick={handleSuccessConfirm}
                    className="w-full h-12 text-lg font-bold text-white bg-linear-to-r from-[oklch(0.75_0.12_165)] to-[oklch(0.7_0.18_350)] hover:opacity-90 shadow-lg transform transition-transform hover:scale-[1.02]"
                  >
                    확인하러 가기
                  </Button>
                  <p className="text-xs text-center text-gray-500 font-medium">
                    {countdown}초 후 자동으로 이동합니다
                  </p>
                </div>
              </div>
            </div>
          );
      }
    })();

    // [수정됨] 컨텐츠를 감싸는 스크롤 컨테이너
    // pb-60 (약 240px)을 추가하여 키보드가 올라왔을 때도 스크롤할 여유 공간을 충분히 확보
    return (
      <div
        className={`max-h-[80vh] overflow-y-auto overflow-x-hidden p-1 scrollbar-hidden mobile-padding
      `}
      >
        {content}
      </div>
    );
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            resetDialog();
          }
          onOpenChange(isOpen);
        }}
      >
        <DialogContent
          onOpenAutoFocus={(e) => e.preventDefault()}
          className={`sm:max-w-[425px] transition-all duration-300 ${
            step === "success" || step === "waitingSuccess"
              ? "p-0 border-0 overflow-hidden bg-transparent shadow-none" // 이 부분 필수
              : ""
          }`}
        >
          {renderStep()}
        </DialogContent>
      </Dialog>

      {/* 동의서 모달 */}
      <Dialog open={isConsentModalOpen} onOpenChange={setIsConsentModalOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b bg-linear-to-r from-[oklch(0.75_0.12_165/0.1)] to-[oklch(0.7_0.18_350/0.1)]">
            <DialogTitle className="text-2xl font-bold text-[oklch(0.75_0.12_165)]">
              개인정보 수집 및 이용 동의서
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-auto p-6 bg-muted/5">
            {!consentFile && (
              <div className="flex flex-col items-center justify-center py-16 space-y-4">
                <FileText className="w-16 h-16 text-muted-foreground/50" />
                <p className="text-lg text-muted-foreground">
                  동의서 파일을 불러올 수 없습니다.
                </p>
              </div>
            )}

            {consentFile && consentFile.type === "pdf" && (
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <iframe
                  src={`${consentFile.url}#toolbar=0`}
                  className="w-full h-[calc(90vh-300px)] border-0"
                  title="개인정보 수집 및 이용 동의서"
                />
              </div>
            )}

            {consentFile && consentFile.type === "image" && (
              <div className="flex justify-center">
                <img
                  src={consentFile.url}
                  alt="개인정보 수집 및 이용 동의서"
                  className="max-w-full h-auto rounded-lg shadow-md"
                />
              </div>
            )}

            {consentFile && consentFile.type === "doc" && (
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
                <Button
                  asChild
                  size="lg"
                  className="gap-2 bg-[oklch(0.75_0.12_165)] hover:bg-[oklch(0.7_0.12_165)]"
                >
                  <a
                    href={consentFile.url}
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

          <div className="px-6 py-4 border-t bg-muted/30 space-y-4">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={tempConsent}
                onCheckedChange={(checked) => {
                  setTempConsent(checked === true);
                }}
                id="consent-check"
              />
              <label
                htmlFor="consent-check"
                className="text-sm font-medium leading-none cursor-pointer"
              >
                동의함
              </label>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setIsConsentModalOpen(false)}
                variant="outline"
                className="flex-1 border-[oklch(0.75_0.12_165/0.3)] hover:bg-[oklch(0.75_0.12_165/0.1)]"
              >
                취소
              </Button>
              <Button
                onClick={handleConsentConfirm}
                className="flex-1 bg-[oklch(0.75_0.12_165)] hover:bg-[oklch(0.7_0.12_165)]"
              >
                확인
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
