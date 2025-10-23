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
import { rentRamenWithPin } from "@/lib/actions/rental";
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
import { pinRentalSchema } from "@/lib/validators/rental";

interface RentalDialogProps {
  ramen: Ramen | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type PinRentalFormValues = z.infer<typeof pinRentalSchema>;

export function RentalDialog({ ramen, open, onOpenChange }: RentalDialogProps) {
  const form = useForm<PinRentalFormValues>({
    resolver: zodResolver(pinRentalSchema),
    defaultValues: {
      phoneNumber: "",
      pin: "",
      ramenId: ramen?.id,
    },
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
    reset,
  } = form;

  const handleRental = async (values: PinRentalFormValues) => {
    if (!ramen) {
      toast.error("라면 정보가 없습니다.");
      return;
    }

    try {
      const result = await rentRamenWithPin({ ...values, ramenId: ramen.id });
      if (result.error) {
        throw new Error(result.error);
      }
      toast.success(`'${ramen.name}' 대여가 완료되었습니다.`);
      onOpenChange(false);
      reset();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "대여에 실패했습니다."
      );
    }
  };

  if (!ramen) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        onOpenChange(isOpen);
        if (!isOpen) {
          reset();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>라면 대여</DialogTitle>
          <DialogDescription>
            '{ramen.name}'을(를) 대여하려면 휴대폰 번호와 PIN 4자리를
            입력하세요.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p>
            <span className="font-semibold">제조사:</span> {ramen.manufacturer}
          </p>
          <p>
            <span className="font-semibold">남은 재고:</span> {ramen.stock}개
          </p>
        </div>
        <Form {...form}>
          <form onSubmit={handleSubmit(handleRental)} className="space-y-4">
            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>휴대폰 번호</FormLabel>
                  <FormControl>
                    <Input placeholder="010-1234-5678" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
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
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                취소
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || ramen.stock === 0}
              >
                {isSubmitting ? "처리 중..." : "대여"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
