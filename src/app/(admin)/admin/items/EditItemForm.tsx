"use client";

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
import { Switch } from "@/components/ui/switch";

const updateItemClientSchema = z.object({
  name: z.string().min(1, "이름을 입력해주세요."),
  category: z.string().min(1, "카테고리를 입력해주세요."),
  imageUrl: z.any().optional(),
  isTimeLimited: z.boolean().optional(),
  rentalTimeMinutes: z.coerce
    .number()
    .int()
    .positive("대여 시간은 양의 정수여야 합니다.")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  maxRentalsPerUser: z.coerce
    .number()
    .int()
    .positive("최대 대여 횟수는 양의 정수여야 합니다.")
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

type UpdateItemSchema = z.infer<typeof updateItemClientSchema>;

interface EditItemFormProps {
  item: Item;
  children: React.ReactNode;
}

export function EditItemForm({ item, children }: EditItemProps) {
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
      isTimeLimited: item.isTimeLimited || false,
      rentalTimeMinutes: item.rentalTimeMinutes || undefined,
      maxRentalsPerUser: item.maxRentalsPerUser || undefined,
    },
  });

  const isTimeLimited = form.watch("isTimeLimited");

  const onSubmit = async (values: UpdateItemSchema) => {
    const formData = new FormData();
    formData.append("id", item.id.toString());
    formData.append("name", values.name);
    formData.append("category", values.category);
    formData.append("isTimeLimited", String(values.isTimeLimited));
    if (values.rentalTimeMinutes !== undefined) {
      formData.append("rentalTimeMinutes", String(values.rentalTimeMinutes));
    }
    if (values.maxRentalsPerUser !== undefined) {
      formData.append("maxRentalsPerUser", String(values.maxRentalsPerUser));
    }

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

            <FormField
              control={form.control}
              name="isTimeLimited"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">시간제 대여</FormLabel>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {isTimeLimited && (
              <>
                <FormField
                  control={form.control}
                  name="rentalTimeMinutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>대여 시간 (분)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="ex) 30" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="maxRentalsPerUser"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>사용자별 최대 대여 횟수</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="ex) 3" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

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
