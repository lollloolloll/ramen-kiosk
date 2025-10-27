"use client";

import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { addRamen } from "@/lib/actions/item";
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
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  manufacturer: z.string().min(2, {
    message: "Manufacturer must be at least 2 characters.",
  }),
  stock: z.coerce.number().min(0, {
    message: "Stock cannot be negative.",
  }),
  imageUrl: z.any().optional(),
});

export function AddRamenForm() {
  const router = useRouter();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as Resolver<z.infer<typeof formSchema>>,
    defaultValues: {
      name: "",
      manufacturer: "",
      stock: 1,
      imageUrl: undefined, // Changed to undefined for file input
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const formData = new FormData();
    formData.append("name", values.name);
    formData.append("manufacturer", values.manufacturer);
    formData.append("stock", values.stock.toString());
    if (values.imageUrl) {
      formData.append("image", values.imageUrl);
    }

    const result = await addRamen(formData);

    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Ramen added successfully!");
      router.refresh(); // Refresh the page to show new ramen
      // TODO: Close the dialog here. This component likely receives a prop like `onSuccess` or `setOpen(false)`. For now, just refreshing.
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
                <Input placeholder="ex)신라면" {...field} />
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
                <Input placeholder="ex)농심" {...field} />
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
              <FormLabel>수량</FormLabel>
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
          <Button type="submit">라면 추가</Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
