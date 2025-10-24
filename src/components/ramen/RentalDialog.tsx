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
import { Ramen } from "@/app/(admin)/admin/stock/columns";
import { rentRamen } from "@/lib/actions/rental";
import { findUserByNameAndPhone, createGeneralUser } from "@/lib/actions/generalUser";
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
import { useState, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";

interface RentalDialogProps {
  ramen: Ramen | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = "identification" | "register";

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

export function RentalDialog({ ramen, open, onOpenChange }: RentalDialogProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("identification");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    mode: "onChange",
  });

  const handleIdentificationSubmit = async (values: IdentificationFormValues) => {
    setIsSubmitting(true);
    try {
      const user = await findUserByNameAndPhone(values.name, values.phoneNumber);
      if (user) {
        await handleRental(user.id);
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
        toast.success("사용자 등록이 완료되었습니다.");
        await handleRental(result.user.id);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "사용자 등록에 실패했습니다."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRental = async (userId: number) => {
    if (!ramen) {
      toast.error("라면 정보가 없습니다.");
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await rentRamen(userId, ramen.id);
      if (result.error) {
        throw new Error(result.error);
      }
      toast.success(`'${ramen.name}' 대여가 완료되었습니다.`);
      router.refresh();
      closeDialog();
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

  const resetDialog = () => {
    setStep("identification");
    identificationForm.reset();
    registerForm.reset();
  };

  if (!ramen) return null;

  const renderStep = () => {
    switch (step) {
      case "identification":
        return (
          <Form {...identificationForm}>
            <form
              onSubmit={identificationForm.handleSubmit(handleIdentificationSubmit)}
              className="space-y-4"
            >
              <DialogHeader>
                <DialogTitle>라면 대여</DialogTitle>
                <DialogDescription>
                  '{ramen.name}'을(를) 대여하려면 이름과 휴대폰 번호를
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
                        {...field}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => {
                          const formatted = formatPhoneNumber(e.target.value);
                          field.onChange(formatted);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
        return (
          <Form {...registerForm}>
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
                    <FormLabel>이름</FormLabel>
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
                    <FormLabel>휴대폰 번호</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="010-1234-5678"
                        {...field}
                        onChange={(e) =>
                          field.onChange(formatPhoneNumber(e.target.value))
                        }
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
                    <FormLabel>성별</FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={field.value === "남" ? "default" : "outline"}
                          onClick={() => field.onChange("남")}
                        >
                          남
                        </Button>
                        <Button
                          type="button"
                          variant={field.value === "여" ? "default" : "outline"}
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
                control={registerForm.control}
                name="birthDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>생년월일</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>생년월일을 선택하세요</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={
                            field.value ? new Date(field.value) : undefined
                          }
                          onSelect={(date) =>
                            field.onChange(date?.toISOString().split("T")[0])
                          }
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={registerForm.control}
                name="school"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>학교 (선택)</FormLabel>
                    <FormControl>
                      <Input placeholder="땡땡 초등학교" {...field} />
                    </FormControl>
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
                      <FormLabel>
                        개인정보 수집 및 이용에 동의합니다.
                      </FormLabel>
                      <FormDescription>
                        (필수) 이름, 연락처, 성별, 생년월일
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
                  disabled={isSubmitting || !registerForm.formState.isValid}
                >
                  {isSubmitting ? "등록 중..." : "등록 및 대여"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
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
