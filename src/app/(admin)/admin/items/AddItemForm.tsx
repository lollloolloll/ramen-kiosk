"use client";

import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { addItem } from "@/lib/actions/item";
import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Resolver } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { DialogFooter } from "@/components/ui/dialog";

const formSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, {
      message: "Name must be at least 2 characters.",
    })
    .transform((val) => val.replace(/\s/g, "")),
  category: z
    .string()
    .trim()
    .min(2, {
      message: "Category must be at least 2 characters.",
    })
    .transform((val) => val.replace(/\s/g, "")),
  imageUrl: z
    .any()
    .optional()
    .transform((val) => {
      if (val instanceof File) {
        // If it's a File object, we don't modify the file name directly here.
        // The file name will be handled when uploading.
        return val;
      }
      // If it's a string (e.g., from defaultValues or if it's a URL string), remove spaces.
      return typeof val === "string" ? val.replace(/\s/g, "") : val;
    }),
});

export function AddItemForm() {
  const router = useRouter();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as Resolver<z.infer<typeof formSchema>>,
    defaultValues: {
      name: "",
      category: "",
      imageUrl: undefined, // Changed to undefined for file input
    },
  });
  async function onSubmit(values: z.infer<typeof formSchema>) {
    const formData = new FormData();
    formData.append("name", values.name);
    formData.append("category", values.category);

    if (values.imageUrl instanceof File) {
      const file = values.imageUrl;
      const originalName = file.name;

      // 확장자 분리
      const lastDotIndex = originalName.lastIndexOf(".");
      const extension =
        lastDotIndex !== -1 ? originalName.slice(lastDotIndex) : "";
      const nameWithoutExt =
        lastDotIndex !== -1
          ? originalName.slice(0, lastDotIndex)
          : originalName;

      // 파일명 정규화
      const sanitizedName = nameWithoutExt
        .replace(/[\s\(\)]/g, "-") // 공백, 괄호를 하이픈으로
        .replace(/[^a-zA-Z0-9가-힣-]/g, "") // 영문, 숫자, 한글, 하이픈만 유지
        .replace(/-+/g, "-") // 연속된 하이픈을 하나로
        .replace(/^-|-$/g, ""); // 시작/끝 하이픈 제거

      // 고유 식별자 추가 (충돌 방지)
      const uniqueSuffix = `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 10)}`;
      const filename = `${sanitizedName}-${uniqueSuffix}${extension}`;

      const newFile = new File([file], filename, { type: file.type });
      formData.append("image", newFile);
    }

    const result = await addItem(formData);

    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Item added successfully!");
      router.refresh();
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>이름</FormLabel>
              <FormControl>
                <Input placeholder="ex)라면" {...field} />
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
                <Input placeholder="ex)스포츠" {...field} />
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
              <FormLabel>이미지</FormLabel>
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
              {field.value && field.value instanceof File && (
                <img
                  src={URL.createObjectURL(field.value)}
                  alt="Image Preview"
                  className="mt-2 h-20 w-20 object-cover rounded-md"
                />
              )}
            </FormItem>
          )}
        />
        <DialogFooter>
          <Button type="submit">아이템 추가</Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
