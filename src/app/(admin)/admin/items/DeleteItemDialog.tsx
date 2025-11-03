"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteItem } from "@/lib/actions/item";
import { toast } from "sonner";

interface DeleteItemDialogProps {
  itemId: number;
  children: React.ReactNode;
}

export function DeleteItemDialog({
  itemId,
  children,
}: DeleteItemDialogProps) {
  const handleDelete = async () => {
    try {
      const result = await deleteItem(itemId);
      if (result.error) {
        throw new Error(result.error);
      }
      toast.success("아이템이 삭제되었습니다.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "아이템 삭제에 실패했습니다."
      );
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>정말로 삭제하시겠습니까?</AlertDialogTitle>
          <AlertDialogDescription>
            이 작업은 되돌릴 수 없습니다. 해당 아이템 정보가 서버에서 영구적으로
            삭제됩니다.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete}>삭제</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
