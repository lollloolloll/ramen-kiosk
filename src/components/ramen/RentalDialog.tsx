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
import { getUsersByPin, createGeneralUser } from "@/lib/actions/generalUser";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { generalUserSchema } from "@/lib/validators/generalUser";
import { useState, ChangeEvent } from "react";
import { Resolver } from "react-hook-form";

interface RentalDialogProps {
  ramen: Ramen | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = "pin" | "select-user" | "register";

const pinSchema = z.object({
  pin: z
    .string()
    .min(4, "PIN은 4자리여야 합니다.")
    .max(4, "PIN은 4자리여야 합니다."),
});
type PinFormValues = z.infer<typeof pinSchema>;

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
  const [step, setStep] = useState<Step>("pin");
  const [matchingUsers, setMatchingUsers] = useState<
    { id: number; name: string }[]
  >([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pinForm = useForm<PinFormValues>({
    resolver: zodResolver(pinSchema),
    defaultValues: { pin: "" },
  });

  const registerForm = useForm<GeneralUserFormValues>({
    resolver: zodResolver(generalUserSchema) as Resolver<GeneralUserFormValues>,
    defaultValues: {
      name: "",
      phoneNumber: "",
      gender: "",
      age: undefined,
      pin: "",
    },
    mode: "onChange",
  });

  const handlePinSubmit = async ({ pin }: PinFormValues) => {
    setIsSubmitting(true);
    try {
      const users = await getUsersByPin(pin);
      if (users.length === 0) {
        toast.info("입력하신 PIN이 존재하지 않습니다. 새로 등록해주세요.");
        setStep("register");
        registerForm.setValue("pin", pin);
      } else if (users.length === 1) {
        await handleRental(users[0].id);
      } else {
        setMatchingUsers(users);
        setStep("select-user");
      }
    } catch (error) {
      toast.error("PIN 확인 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUserSelect = async (userId: number) => {
    await handleRental(userId);
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
    setStep("pin");
    setMatchingUsers([]);
    pinForm.reset();
    registerForm.reset();
  };

  if (!ramen) return null;

  const renderStep = () => {
    switch (step) {
      case "pin":
        return (
          <Form {...pinForm}>
            <form
              onSubmit={pinForm.handleSubmit(handlePinSubmit)}
              className="space-y-4"
            >
              <DialogHeader>
                <DialogTitle>라면 대여</DialogTitle>
                <DialogDescription>
                  '{ramen.name}'을(를) 대여하려면 PIN 4자리를 입력하세요.
                </DialogDescription>
              </DialogHeader>
              <FormField
                control={pinForm.control}
                name="pin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PIN</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="PIN 4자리"
                        maxLength={4}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={closeDialog}
                  disabled={isSubmitting}
                >
                  취소
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep("register")}
                  disabled={isSubmitting}
                  className="border-blue-500 text-blue-600 hover:bg-blue-50"
                >
                  신규 등록
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isSubmitting ? "확인 중..." : "확인"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        );
      case "select-user":
        return (
          <div>
            <DialogHeader>
              <DialogTitle>사용자 선택</DialogTitle>
              <DialogDescription>
                동일한 PIN을 사용하는 여러 사용자가 있습니다. 본인 명의의
                아이디를 선택해주세요.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2 py-4">
              {matchingUsers.map((user) => (
                <Button
                  key={user.id}
                  variant="outline"
                  onClick={() => handleUserSelect(user.id)}
                  className="h-12 text-base hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700 transition-colors"
                >
                  {user.name}
                </Button>
              ))}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep("pin")}
              >
                뒤로
              </Button>
            </DialogFooter>
          </div>
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
                      <Input
                        placeholder="홍길동"
                        value={field.value || ""}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
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
              <FormItem>
                <FormLabel>성별</FormLabel>
                <FormControl>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className={
                        registerForm.watch("gender") === "남"
                          ? "bg-blue-500 text-white hover:bg-blue-600 border-blue-500"
                          : "hover:bg-gray-50"
                      }
                      onClick={() => registerForm.setValue("gender", "남")}
                    >
                      남
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className={
                        registerForm.watch("gender") === "여"
                          ? "bg-pink-500 text-white hover:bg-pink-600 border-pink-500"
                          : "hover:bg-gray-50"
                      }
                      onClick={() => registerForm.setValue("gender", "여")}
                    >
                      여
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
              <FormField
                control={registerForm.control}
                name="age"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>나이</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="30"
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(value === "" ? undefined : +value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={registerForm.control}
                name="pin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PIN</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="PIN 4자리"
                        maxLength={4}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setStep("pin")}
                  disabled={isSubmitting}
                >
                  뒤로
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-green-600 hover:bg-green-700"
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
      <DialogContent>{renderStep()}</DialogContent>
    </Dialog>
  );
}
