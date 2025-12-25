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
import { useForm, useFieldArray, Resolver, useWatch } from "react-hook-form";
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
import { useState, useEffect, useMemo, useRef } from "react";
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
import { cn } from "@/lib/utils";

interface RentalDialogProps {
  item: Item | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  consentFile: { url: string; type: "pdf" | "image" | "doc" } | null;
}

type Step = "identification" | "register" | "success" | "waitingSuccess";

const identificationSchema = z.object({
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

const SCHOOL_DATA: Record<string, string[]> = {
  초등학교: [
    "가인초",
    "누원초",
    "도봉초",
    "동북초",
    "방학초",
    "백운초",
    "숭미초",
    "신방학초",
    "신학초",
    "신창초",
    "신화초",
    "쌍문초",
    "오봉초",
    "월천초",
    "자운초",
    "창경초",
    "창도초",
    "창동초",
    "창림초",
    "창원초",
    "창일초",
    "초당초",
    "한신초",
  ],
  중학교: [
    "노곡중",
    "도봉중",
    "방학중",
    "백운중",
    "북서울중",
    "선덕중",
    "신도봉중",
    "신방학중",
    "정의여중",
    "창동중",
    "창북중",
    "창일중",
    "효문중",
  ],
  고등학교: [
    "누원고",
    "서울문화고",
    "서울외고",
    "선덕고",
    "세그루패션고",
    "자운고",
    "정의여고",
    "창동고",
    "효문고",
  ],
  대학교: [
    "광운대",
    "삼육대",
    "인덕대",
    "이화여대",
    "남서울대",
    "서일대",
    "서울과기대",
    "서울여대",
    "덕성여대",
  ],
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
  const [waitingList, setWaitingList] = useState<any[]>([]);
  const [isLoadingWaitingList, setIsLoadingWaitingList] = useState(false);
  const [isConsentModalOpen, setIsConsentModalOpen] = useState(false);
  const [tempConsent, setTempConsent] = useState(false);
  const [currentRenter, setCurrentRenter] = useState<{
    userName: string | null;
    rentalDate: number | null;
    returnDueDate: number | null;
    maleCount: number;
    femaleCount: number;
  } | null>(null);
  const [isDirectInput, setIsDirectInput] = useState(false);
  const [showSchoolPanel, setShowSchoolPanel] = useState(false);

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
  const [dialogKey, setDialogKey] = useState(0);
  const formScrollRef = useRef<HTMLDivElement>(null);

  // [추가 1] 패널에서 클릭했는지 확인하는 Ref
  const isPanelClickRef = useRef(false);

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
  const { fields, replace } = useFieldArray({
    control: identificationForm.control,
    name: "participants",
  });

  // [추가 2] 학교 값이 바뀌는 것을 감시
  const watchedSchool = useWatch({
    control: registerForm.control,
    name: "school",
  });
  useEffect(() => {
    if (isPanelClickRef.current && formScrollRef.current) {
      const scrollToBottom = () => {
        if (formScrollRef.current) {
          // scrollHeight를 다시 계산하여 최신 값 사용
          const maxScroll =
            formScrollRef.current.scrollHeight -
            formScrollRef.current.clientHeight;
          formScrollRef.current.scrollTo({
            top: maxScroll,
            behavior: "smooth",
          });
          isPanelClickRef.current = false;
        }
      };

      // 패널이 처음 열릴 때를 대비해 충분한 시간 대기
      if (showSchoolPanel) {
        setTimeout(scrollToBottom, 250);
      } else {
        // 패널이 이미 열려있으면 바로 실행
        setTimeout(scrollToBottom, 100);
      }
    }
  }, [watchedSchool, showSchoolPanel]);

  const maleCount = identificationForm.watch("maleCount") ?? 0;
  const femaleCount = identificationForm.watch("femaleCount") ?? 0;

  useEffect(() => {
    // 자동 카운트 모드이거나 참여자 추적을 안 하면 리스트를 비움 (UI 숨김 처리)
    if (item?.isAutomaticGenderCount || !item?.enableParticipantTracking) {
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
    item?.isAutomaticGenderCount,
    replace,
  ]);

  // [수정 포인트 1] 문제의 원인이었던 useEffect 제거
  // birthYear, birthMonth, birthDay가 변경될 때마다 폼을 업데이트하던 useEffect를 삭제했습니다.
  // 대신 Select의 onValueChange에서 직접 처리합니다.

  useEffect(() => {
    if (schoolLevel === "해당없음") {
      registerForm.setValue("school", "해당없음");
      return;
    }
    if (!schoolName) {
      registerForm.setValue("school", "");
      return;
    }
    if (!isDirectInput) {
      registerForm.setValue("school", schoolName);
    } else {
      let finalName = schoolName;
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
      }
      if (suffix && !finalName.endsWith(suffix)) {
        finalName += suffix;
      }
      registerForm.setValue("school", finalName);
    }
  }, [schoolLevel, schoolName, isDirectInput, registerForm]);

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

  // ... (handleIdentificationSubmit, handleRegisterSubmit, handleRental, handleWaiting 생략 - 기존과 동일) ...
  const handleIdentificationSubmit = async (
    values: IdentificationFormValues
  ) => {
    if (!item) return;

    // 자동 카운트가 꺼져있을 때(수동 입력 모드)만 인원수 체크
    if (!item.isAutomaticGenderCount) {
      if (values.maleCount + values.femaleCount === 0) {
        toast.error("대여 인원을 최소 1명 이상 설정해주세요.");
        return;
      }

      // 수동 입력 모드 + 참여자 추적 활성화 시 이름 체크
      if (item.enableParticipantTracking && values.participants) {
        const hasEmptyName = values.participants.some((p) => !p.name?.trim());
        if (hasEmptyName) {
          toast.error("모든 참여자의 이름을 입력해주세요.");
          return;
        }
      }
    }

    setIsSubmitting(true);
    try {
      // 1. 결과 받아오기
      const result = await findUserByNameAndPhone(
        values.name,
        values.phoneNumber
      );

      // ---------------------------------------------------------
      // CASE A: 사용자 찾음 (로그인 성공)
      // ---------------------------------------------------------
      if (result.status === "found" && result.user) {
        const user = result.user; // 여기서 user 변수를 꺼내야 합니다.

        const status = await checkUserRentalStatus(user.id, item.id);
        if (status.error) throw new Error(status.error);

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
      }

      // CASE B: 이름은 있는데 전화번호가 다름
      else if (result.status === "name_exists_phone_mismatch") {
        toast.warning(`'${values.name}'님은 이미 등록되어 있습니다.`, {
          description:
            "전화번호를 잘못 입력했는지 확인해주세요! (처음이라면 '신규 등록' 클릭)",
          duration: 8000,
          className: "!gap-6 top-margin-warning", // 👈 아이콘과 텍스트 사이 간격
        });
        return;
      }

      // CASE C: 전화번호는 있는데 이름이 다름
      else if (result.status === "phone_exists_name_mismatch") {
        toast.warning("이미 등록된 전화번호입니다.", {
          description: "입력하신 이름과 일치하지 않습니다.",
          duration: 6000,
          className: "!gap-6 top-margin-warning",
        });
        return;
      }

      // ---------------------------------------------------------
      // CASE D: 완전 신규 유저
      // ---------------------------------------------------------
      else {
        // toast.info("등록된 사용자가 아닙니다.", {
        //   description: "신규 등록 페이지로 이동합니다.",
        // });
        proceedToRegister(values);
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

  // [필수 추가] 중복되는 가입 이동 로직을 함수로 분리
  const proceedToRegister = (values: IdentificationFormValues) => {
    setStep("register");
    registerForm.setValue("name", values.name);
    registerForm.setValue("phoneNumber", values.phoneNumber);
    setShowSchoolPanel(false);
  };

  const handleRegisterSubmit = async (values: GeneralUserFormValues) => {
    setIsSubmitting(true);
    try {
      const result = await createGeneralUser(values);
      if (result.error) throw new Error(result.error);
      if (result.user) {
        toast.success("회원가입이 완료되었습니다.");

        // [수정] 회원가입 완료 시 학교 패널 닫기
        setShowSchoolPanel(false);
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
      if (result.error) throw new Error(result.error);
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
      if (result.error) throw new Error(result.error);
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
    resetDialog();
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

    // 폼 완전 초기화
    identificationForm.reset();
    registerForm.reset();

    // 로컬 상태 초기화
    setBirthYear(undefined);
    setBirthMonth(undefined);
    setBirthDay(undefined);
    setYearSelectOpen(false);

    setIsDirectInput(false);
    setSchoolLevel("");
    setSchoolName("");
    setYearSelectOpen(false);
    setIsConsentModalOpen(false);
    setShowSchoolPanel(false); // 패널 닫기 초기화
    setSchoolLevel(""); // 학교 레벨 초기화
    setTempConsent(false);
  };

  const handleWaitingListClick = async () => {
    // ... (기존과 동일)
    if (!item) return;
    if (showWaitingList) {
      setShowWaitingList(false);
      return;
    }
    setIsLoadingWaitingList(true);
    try {
      const waitingResult = await getWaitingListByItemId(item.id);
      const renterResult = await getCurrentRenter(item.id);
      if (waitingResult.error) {
        toast.error(waitingResult.error);
        return;
      }
      if (waitingResult.data) setWaitingList(waitingResult.data);
      if (renterResult.success && renterResult.data) {
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
    if (!birthYear || !birthMonth)
      return Array.from({ length: 31 }, (_, i) => i + 1);
    const daysInMonth = new Date(
      parseInt(birthYear),
      parseInt(birthMonth),
      0
    ).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }, [birthYear, birthMonth]);

  if (!item) return null;

  const handleRegisterError = (errors: any) => {
    toast.error("필수 정보를 모두 입력해주세요.");
  };

  // ... (renderSchoolPanel, renderStep 등 나머지 렌더링 로직은 그대로 사용하되, birthDate Select 부분만 수정) ...
  const renderSchoolPanel = () => {
    // ... (기존 코드와 동일)
    if (!schoolLevel || schoolLevel === "해당없음") return null;

    return (
      <div className="flex flex-col h-full border-l pl-6 ml-2 animate-in fade-in slide-in-from-left-4 duration-500">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg text-slate-800">
            {schoolLevel} 목록
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSchoolPanel(false)}
            className="h-8 w-8 rounded-full"
          >
            ✕
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto pr-2 scrollbar-hidden">
          <div className="grid grid-cols-2 gap-2 pb-4">
            {SCHOOL_DATA[schoolLevel]?.map((school) => {
              const currentVal = registerForm.getValues("school");
              const isSelected = currentVal && currentVal.startsWith(school);
              return (
                <Button
                  key={school}
                  type="button"
                  variant={isSelected ? "default" : "outline"}
                  onClick={() => {
                    setIsDirectInput(false);
                    setSchoolName(school);
                    let finalName = school;
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
                    }
                    if (suffix && !finalName.endsWith(suffix))
                      finalName += suffix;
                    isPanelClickRef.current = true;

                    registerForm.setValue("school", finalName);
                    registerForm.trigger("school");
                  }}
                  className={cn(
                    "h-12 w-full justify-center px-4 text-center transition-all",
                    isSelected
                      ? "bg-[oklch(0.75_0.12_165)] hover:bg-[oklch(0.7_0.12_165)] ring-offset-1 ring-[oklch(0.75_0.12_165)]"
                      : "border-slate-200 hover:border-[oklch(0.75_0.12_165)]"
                  )}
                >
                  {school}
                  {isSelected && <span className="text-xs">✓</span>}
                </Button>
              );
            })}
            <Button
              type="button"
              variant={isDirectInput ? "default" : "outline"}
              onClick={() => {
                setIsDirectInput(true);
                setSchoolName("");
                registerForm.setValue("school", "");
              }}
              className={cn(
                "h-12 w-full justify-center px-4 text-center font-semibold border-dashed",
                isDirectInput
                  ? "bg-slate-800 text-white hover:bg-slate-700"
                  : "text-slate-500 border-slate-300"
              )}
            >
              ✎ 직접 입력
            </Button>
          </div>
        </div>

        {/* 직접 입력창 (패널 하단에 고정) */}
        {isDirectInput && (
          <div className="pt-4 border-t mt-auto animate-in slide-in-from-bottom-2">
            <p className="text-xs text-muted-foreground mb-1">
              학교 이름 직접 입력
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="예: 선덕"
                value={schoolName}
                onChange={(e) => {
                  const val = e.target.value.replace(/\s/g, "");
                  setSchoolName(val);

                  let finalName = val;
                  if (val) {
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
                    }
                    if (suffix && !finalName.endsWith(suffix))
                      finalName += suffix;
                  }
                  registerForm.setValue("school", finalName);
                }}
                className="flex-1"
              />
              <Button
                onClick={() => {
                  if (schoolName) setShowSchoolPanel(false);
                }}
                className="bg-[oklch(0.75_0.12_165)]"
              >
                완료
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };
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
                {/* ... 헤더 및 기타 필드 ... */}
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
                      {/* ... (생략된 현황 요약 카드 내용) ... */}
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
                              <div className="max-h-[200px] overflow-y-auto p-2 space-y-1 scrollbar-hidden">
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
                          autoComplete="off"
                          autoCorrect="off"
                          lang="ko"
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
                          type="text"
                          inputMode="text"
                          autoComplete="off"
                          autoCorrect="off"
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
                {/* 1. 성별 인원 입력: 옵션이 켜져 있을 때만 보임 */}
                {!item.isAutomaticGenderCount && (
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
                                <Input
                                  {...field}
                                  type="number"
                                  readOnly
                                  className="h-8 flex-1 border-0 bg-transparent text-center focus-visible:ring-0 shadow-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
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
                )}
                {/* 2. 참여자 이름 입력: 
       성별 인원 입력을 받을 때만 친구 이름을 입력받는 것이 논리적으로 맞음.
       isAutomaticGenderCount가 꺼져 있으면 "본인 1명"으로 간주하므로 입력칸을 숨김. 
*/}
                {!item.isAutomaticGenderCount &&
                  item.enableParticipantTracking &&
                  fields.length > 0 && (
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
                        참여하는 친구들의 이름을 모두 입력해주세요.(본인 포함)
                      </FormDescription>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-5 max-h-48 overflow-y-auto pr-1 pt-3 pl-1 scrollbar-hidden">
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
                                      autoComplete="off"
                                      autoCorrect="off"
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
                      const currentValues = identificationForm.getValues();
                      setStep("register");
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
          return (
            <Form {...registerForm} key="register">
              <form
                onSubmit={registerForm.handleSubmit(
                  handleRegisterSubmit,
                  handleRegisterError
                )}
                className="space-y-4"
              >
                {/* ... 헤더 및 이름, 폰번호, 성별 필드는 기존과 동일 ... */}
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
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>
                        이름
                        <span className="text-[oklch(0.7_0.18_350)]">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="홍길동"
                          {...field}
                          autoComplete="off"
                          autoCorrect="off"
                          lang="ko"
                          className={cn(
                            "focus-visible:outline-none! focus-visible:ring-0! focus-visible:ring-offset-0! focus-visible:border-2! focus-visible:border-[oklch(0.75_0.12_165)]!",
                            fieldState.invalid &&
                              "border-red-500! focus-visible:border-red-500!"
                          )}
                          onChange={(e) =>
                            field.onChange(e.target.value.replace(/\s/g, ""))
                          }
                        />
                      </FormControl>
                      <FormMessage className="text-red-500" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={registerForm.control}
                  name="phoneNumber"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>
                        휴대폰 번호
                        <span className="text-[oklch(0.7_0.18_350)]">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="010-1234-5678"
                          type="text"
                          inputMode="text"
                          autoComplete="off"
                          autoCorrect="off"
                          {...field}
                          className={cn(
                            "focus-visible:outline-none! focus-visible:ring-0! focus-visible:ring-offset-0! focus-visible:border-2! focus-visible:border-[oklch(0.75_0.12_165)]!",
                            fieldState.invalid &&
                              registerForm.formState.isSubmitted &&
                              "border-red-500! focus-visible:border-red-500!"
                          )}
                          onChange={(e) => {
                            const formatted = formatPhoneNumber(e.target.value);
                            field.onChange(formatted);
                            if (
                              registerForm.formState.isSubmitted ||
                              fieldState.invalid
                            ) {
                              registerForm.trigger("phoneNumber");
                            }
                          }}
                          maxLength={13}
                        />
                      </FormControl>
                      <FormMessage className="text-red-500" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={registerForm.control}
                  name="gender"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel
                        className={cn(fieldState.invalid && "text-red-500")}
                      >
                        성별
                        <span className="text-[oklch(0.7_0.18_350)]">*</span>
                      </FormLabel>
                      <FormControl>
                        <div
                          ref={field.ref}
                          tabIndex={-1}
                          className={cn(
                            "flex gap-2 p-1 rounded-md",
                            fieldState.invalid && "border border-red-500" // ring-1 → border
                          )}
                        >
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
                      <FormMessage className="text-red-500" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={registerForm.control}
                  name="birthDate"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel
                        className={cn(
                          fieldState.invalid &&
                            registerForm.formState.isSubmitted &&
                            "text-red-500"
                        )}
                      >
                        생년월일
                        <span className="text-[oklch(0.7_0.18_350)]">*</span>
                      </FormLabel>
                      <div
                        ref={field.ref}
                        tabIndex={-1}
                        className={cn(
                          "flex gap-2 rounded-md",
                          fieldState.invalid &&
                            registerForm.formState.isSubmitted &&
                            "border border-red-500 p-1" // ring-1 → border
                        )}
                      >
                        <Select
                          onValueChange={(value) => {
                            setBirthYear(value);
                            // 즉시 값을 조합하여 폼에 전달. Month/Day가 없으면 빈 값 취급
                            field.onChange(
                              `${value}-${birthMonth || ""}-${birthDay || ""}`
                            );
                            registerForm.clearErrors("birthDate");
                          }}
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
                          onValueChange={(value) => {
                            setBirthMonth(value);
                            field.onChange(
                              `${birthYear || ""}-${value}-${birthDay || ""}`
                            );
                            registerForm.clearErrors("birthDate");
                          }}
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

                        <Select
                          onValueChange={(value) => {
                            setBirthDay(value);
                            field.onChange(
                              `${birthYear || ""}-${birthMonth || ""}-${value}`
                            );
                            registerForm.clearErrors("birthDate");
                          }}
                          value={birthDay}
                        >
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
                      <FormMessage className="text-red-500" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={registerForm.control}
                  name="school"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel
                        className={cn(fieldState.invalid && "text-red-500")}
                      >
                        학교
                        <span className="text-[oklch(0.7_0.18_350)]">*</span>
                      </FormLabel>

                      <div className="space-y-4">
                        <div
                          ref={field.ref}
                          tabIndex={-1}
                          className={cn(
                            "grid grid-cols-3 gap-2 rounded-md outline-none transition-all duration-300",
                            fieldState.invalid && "border border-red-500 p-1" // ring-1 → border
                          )}
                        >
                          {[
                            "초등학교",
                            "중학교",
                            "고등학교",
                            "대학교",
                            "해당없음",
                          ].map((level) => (
                            <Button
                              key={level}
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setSchoolLevel(level);

                                if (level === "해당없음") {
                                  setShowSchoolPanel(false);
                                  registerForm.setValue("school", "해당없음");
                                  setSchoolName("");
                                  setIsDirectInput(false);
                                } else {
                                  // 종류 선택 시 오른쪽 패널 열기
                                  setShowSchoolPanel(true);
                                  // 기존 선택된 학교가 새 레벨에 안 맞으면 이름 초기화
                                  if (
                                    !field.value?.endsWith(
                                      level.substring(0, 1)
                                    )
                                  ) {
                                    setSchoolName("");
                                    registerForm.setValue("school", "");
                                  }
                                  setIsDirectInput(false);
                                }
                              }}
                              className={cn(
                                "h-12 text-base font-medium transition-all",
                                schoolLevel === level
                                  ? "bg-[oklch(0.75_0.12_165)] text-white hover:bg-[oklch(0.72_0.12_165)] border-transparent"
                                  : "hover:bg-[oklch(0.75_0.12_165/0.1)] text-slate-600"
                              )}
                            >
                              {level}
                            </Button>
                          ))}
                        </div>

                        {/* 선택된 학교 표시 (패널이 열려있을 때 폼 안에서도 확인 가능하게) */}
                        {field.value && field.value !== "해당없음" && (
                          <div className="p-3 bg-[oklch(0.75_0.12_165/0.1)] rounded-md border border-[oklch(0.75_0.12_165/0.2)] text-[oklch(0.75_0.12_165)] font-bold text-center mx-auto w-fit">
                            {field.value}
                          </div>
                        )}
                      </div>
                      <FormMessage className="text-red-500" />
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
                    onClick={() => {
                      setStep("identification");
                      setShowSchoolPanel(false);
                    }}
                    disabled={isSubmitting}
                  >
                    뒤로
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-[oklch(0.75_0.12_165)] hover:bg-[oklch(0.7_0.12_165)]"
                  >
                    {isSubmitting ? "등록 중..." : "등록"}
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
    return content;
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(isOpen) => {
          if (isOpen) {
            setDialogKey((prev) => prev + 1);
            resetDialog();
          } else {
            resetDialog();
          }
          onOpenChange(isOpen);
        }}
      >
        <DialogContent
          key={dialogKey}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          className={cn(
            "transition-all duration-300 ease-in-out gap-0",
            step === "success" || step === "waitingSuccess"
              ? "sm:max-w-[425px] p-0 border-0 overflow-hidden bg-transparent shadow-none"
              : showSchoolPanel
              ? "sm:max-w-[850px] w-[90vw]" // 패널 열리면 넓어짐
              : "sm:max-w-[425px]"
          )}
        >
          {/* Flex 컨테이너로 감싸서 좌우 배치 */}
          <div className="flex h-full max-h-[85vh]">
            {/* 왼쪽: 기존 폼 (너비 고정 또는 유동) */}
            <div
              ref={formScrollRef}
              className={cn(
                "flex-1 overflow-y-auto transition-all scrollbar-hidden"
              )}
            >
              {renderStep()}
            </div>

            {/* 오른쪽: 학교 선택 패널 (조건부 렌더링) */}
            {showSchoolPanel && (
              <div className="w-[400px] bg-slate-50/50 p-6 rounded-r-lg hidden sm:block">
                {renderSchoolPanel()}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 동의서 모달 */}
      <Dialog open={isConsentModalOpen} onOpenChange={setIsConsentModalOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] p-0 gap-0 overflow-hidden">
          {/* 기존 내용 유지 */}
          <DialogHeader className="px-6 py-4 border-b bg-linear-to-r from-[oklch(0.75_0.12_165/0.1)] to-[oklch(0.7_0.18_350/0.1)]">
            <DialogTitle className="text-2xl font-bold text-[oklch(0.75_0.12_165)]">
              개인정보 수집 및 이용 동의서
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto p-6 bg-muted/5 scrollbar-hidden">
            {/* ... 파일 미리보기 로직 ... */}
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
