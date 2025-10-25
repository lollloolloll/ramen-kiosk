"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
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
import { toast } from "sonner";
import { deleteGeneralUser } from "@/lib/actions/generalUser"; // Assuming deleteGeneralUser is for GeneralUser

interface DeleteUserDialogProps {
  userId: number;
  children: React.ReactNode;
}

export function DeleteUserDialog({ userId, children }: DeleteUserDialogProps) {
  const [open, setOpen] = useState(false);

  const handleDelete = async () => {
    const result = await deleteGeneralUser(userId);
    if (result.success) {
      toast.success("사용자가 삭제되었습니다.");
      setOpen(false);
    } else {
      toast.error(result.error);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>정말로 삭제하시겠습니까?</AlertDialogTitle>
          <AlertDialogDescription>
            이 작업은 되돌릴 수 없습니다. 사용자 ID {userId}를 영구적으로 삭제합니다.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} className="bg-red-500 text-white hover:bg-red-600">
            삭제
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
