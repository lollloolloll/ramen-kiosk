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
import { updateItem } from "@/lib/actions/item";
import { zodResolver } from "@hookform/resolvers/zod";
import React, { useState } from "react";
import { useForm, Resolver } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { Item } from "./columns";
import { useRouter } from "next/navigation";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const updateItemClientSchema = z.object({
  name: z.string().min(1, "이름을 입력해주세요."),
  category: z.string().min(1, "카테고리를 입력해주세요."),
  imageUrl: z.any().optional(),
});

type UpdateItemSchema = z.infer<typeof updateItemClientSchema>;

interface EditItemFormProps {
  item: Item;
  children: React.ReactNode;
}

export function EditItemForm({ item, children }: EditItemFormProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const form = useForm<UpdateItemSchema>({
    resolver: zodResolver(
      updateItemClientSchema
    ) as Resolver<UpdateItemSchema>,
    defaultValues: {
      name: item.name,
      category: item.category,
      imageUrl: item.imageUrl || undefined,
    },
  });

  const onSubmit = async (values: UpdateItemSchema) => {
    const formData = new FormData();
    formData.append("id", item.id.toString());
    formData.append("name", values.name);
    formData.append("category", values.category);
    if (values.imageUrl && values.imageUrl instanceof File) {
      formData.append("image", values.imageUrl);
    } else if (typeof values.imageUrl === "string") {
      formData.append("imageUrl", values.imageUrl);
    }

    try {
      const result = await updateItem(formData);
      if (result.error) {
        throw new Error(result.error);
      }
      toast.success("아이템 정보가 수정되었습니다.");
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "아이템 정보 수정에 실패했습니다."
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>아이템 정보 수정</DialogTitle>
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
                    <Input placeholder="Item Name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>카테고리</FormLabel>
                  <FormControl>
                    <Input placeholder="Category" {...field} />
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
                  <FormLabel>아이템 이미지</FormLabel>
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
                    item.imageUrl && (
                      <img
                        src={item.imageUrl}
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
