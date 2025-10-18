"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateRamen } from "@/lib/actions/ramen";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Ramen } from "./columns";

const updateRamenClientSchema = z.object({
  name: z.string().min(1, "이름을 입력해주세요."),
  manufacturer: z.string().min(1, "제조사를 입력해주세요."),
  stock: z.coerce.number().int().min(0, "재고는 0 이상이어야 합니다."),
  imageUrl: z
    .string()
    .url("유효한 URL을 입력해주세요.")
    .optional()
    .or(z.literal("")),
});

type UpdateRamenSchema = z.infer<typeof updateRamenClientSchema>;

interface EditRamenFormProps {
  ramen: Ramen;
  children: React.ReactNode;
}

export function EditRamenForm({ ramen, children }: EditRamenFormProps) {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    // ✅ FIX: 제네릭 타입을 제거하여 resolver에서 타입을 추론하도록 합니다.
    resolver: zodResolver(updateRamenClientSchema),
    defaultValues: {
      name: ramen.name,
      manufacturer: ramen.manufacturer,
      stock: ramen.stock,
      imageUrl: ramen.imageUrl || "",
    },
  });

  const onSubmit = async (data: UpdateRamenSchema) => {
    try {
      const result = await updateRamen({ id: ramen.id, ...data });
      if (result.error) {
        throw new Error(result.error);
      }
      toast.success("라면 정보가 수정되었습니다.");
      setOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "라면 정보 수정에 실패했습니다."
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>라면 정보 수정</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">이름</Label>
            <Input id="name" {...register("name")} />
            {errors.name && (
              <p className="text-xs text-red-500">{errors.name.message}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="manufacturer">제조사</Label>
            <Input id="manufacturer" {...register("manufacturer")} />
            {errors.manufacturer && (
              <p className="text-xs text-red-500">
                {errors.manufacturer.message}
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="stock">재고</Label>
            <Input id="stock" type="number" {...register("stock")} />
            {errors.stock && (
              <p className="text-xs text-red-500">{errors.stock.message}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="imageUrl">이미지 URL</Label>
            <Input id="imageUrl" {...register("imageUrl")} />
            {errors.imageUrl && (
              <p className="text-xs text-red-500">{errors.imageUrl.message}</p>
            )}
          </div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "수정 중..." : "수정"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
