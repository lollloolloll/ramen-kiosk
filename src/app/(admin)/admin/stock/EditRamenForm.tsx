"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { updateRamen } from "@/lib/actions/ramen";
import { zodResolver } from "@hookform/resolvers/zod";
import React, { useState } from "react";
import { useForm, Resolver } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { Ramen } from "./columns";
import { useRouter } from "next/navigation";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const updateRamenClientSchema = z.object({
  name: z.string().min(1, "이름을 입력해주세요."),
  manufacturer: z.string().min(1, "제조사를 입력해주세요."),
  stock: z.coerce.number().int().min(0, "재고는 0 이상이어야 합니다."),
  imageUrl: z.any().optional(),
});

type UpdateRamenSchema = z.infer<typeof updateRamenClientSchema>;

interface EditRamenFormProps {
  ramen: Ramen;
  children: React.ReactNode;
}

export function EditRamenForm({ ramen, children }: EditRamenFormProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const form = useForm<UpdateRamenSchema>({
    resolver: zodResolver(
      updateRamenClientSchema
    ) as Resolver<UpdateRamenSchema>,
    defaultValues: {
      name: ramen.name,
      manufacturer: ramen.manufacturer,
      stock: ramen.stock,
      imageUrl: ramen.imageUrl || undefined,
    },
  });

  const onSubmit = async (values: UpdateRamenSchema) => {
    const formData = new FormData();
    formData.append("name", values.name);
    formData.append("manufacturer", values.manufacturer);
    formData.append("stock", values.stock.toString());
    if (values.imageUrl && values.imageUrl instanceof File) {
      formData.append("image", values.imageUrl);
    } else if (typeof values.imageUrl === "string") {
      formData.append("imageUrl", values.imageUrl);
    }

    try {
      const result = await updateRamen(formData);
      if (result.error) {
        throw new Error(result.error);
      }
      toast.success("라면 정보가 수정되었습니다.");
      setOpen(false);
      router.refresh();
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
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>이름</FormLabel>
                  <FormControl>
                    <Input placeholder="Ramen Name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="manufacturer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>제조사</FormLabel>
                  <FormControl>
                    <Input placeholder="Manufacturer" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="stock"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>재고</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>라면 이미지</FormLabel>
                  <FormControl>
                    <Input
                      type="file"
                      accept="image/*"
                      className="cursor-pointer"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) {
                          field.onChange(file);
                        } else {
                          field.onChange(undefined);
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                  {field.value && field.value instanceof File ? (
                    <img
                      src={URL.createObjectURL(field.value)}
                      alt="Image Preview"
                      className="mt-2 h-20 w-20 object-cover rounded-md"
                    />
                  ) : (
                    ramen.imageUrl && (
                      <img
                        src={ramen.imageUrl}
                        alt="Current Image"
                        className="mt-2 h-20 w-20 object-cover rounded-md"
                      />
                    )
                  )}
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "수정 중..." : "수정"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
