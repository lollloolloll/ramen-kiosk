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
import { executeRental } from "@/lib/actions/rental";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { useState } from "react";

interface RentalDialogProps {
  ramen: Ramen | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RentalDialog({ ramen, open, onOpenChange }: RentalDialogProps) {
  const { data: session } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRental = async () => {
    if (!ramen || !session?.user?.id) {
      toast.error("로그인이 필요하거나 라면 정보가 없습니다.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await executeRental({
        userId: session.user.id,
        ramenId: ramen.id,
      });
      if (result.error) {
        throw new Error(result.error);
      }
      toast.success(`'${ramen.name}' 대여가 완료되었습니다.`);
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "대여에 실패했습니다."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!ramen) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>라면 대여 확인</DialogTitle>
          <DialogDescription>
            정말로 '{ramen.name}'을(를) 대여하시겠습니까?
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
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            취소
          </Button>
          <Button
            onClick={handleRental}
            disabled={isSubmitting || ramen.stock === 0}
          >
            {isSubmitting ? "처리 중..." : "대여"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
