"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { DialogFooter } from "@/components/ui/dialog";
import { createGeneralUser } from "@/lib/actions/generalUser";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "이름은 2자 이상이어야 합니다.",
  }),
  phoneNumber: z.string().regex(/^010-\d{4}-\d{4}$/, {
    message: "유효한 전화번호 형식이 아닙니다 (예: 010-1234-5678).",
  }),
  gender: z.enum(["MALE", "FEMALE"], {
    message: "성별을 선택해주세요.",
  }),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
    message: "유효한 생년월일 형식이 아닙니다 (예: 2000-01-01).",
  }),
  school: z.string().min(2, {
    message: "학교는 2자 이상이어야 합니다.",
  }),
  personalInfoConsent: z.boolean().refine((val) => val === true, {
    message: "개인정보 수집 및 이용에 동의해야 합니다.",
  }),
});

export function AddUserForm() {
  const router = useRouter();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      phoneNumber: "",
      gender: "MALE", // Default gender
      birthDate: "",
      school: "",
      personalInfoConsent: false,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const formData = new FormData();
    formData.append("name", values.name);
    formData.append("phoneNumber", values.phoneNumber);
    formData.append("gender", values.gender);
    formData.append("birthDate", values.birthDate);
    formData.append("school", values.school);
    formData.append(
      "personalInfoConsent",
      values.personalInfoConsent.toString()
    );

    const result = await createGeneralUser(formData);

    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("사용자가 성공적으로 추가되었습니다!");
      router.refresh();
      form.reset();
      // TODO: Close the dialog here. This component likely receives a prop like `onSuccess` or `setOpen(false)`. For now, just refreshing.
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>이름</FormLabel>
              <FormControl>
                <Input placeholder="사용자 이름" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phoneNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>전화번호</FormLabel>
              <FormControl>
                <Input placeholder="010-1234-5678" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="gender"
          render={({ field }) => (
            <FormItem>
              <FormLabel>성별</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="성별을 선택하세요" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="MALE">남성</SelectItem>
                  <SelectItem value="FEMALE">여성</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="birthDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>생년월일</FormLabel>
              <FormControl>
                <Input placeholder="YYYY-MM-DD" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="school"
          render={({ field }) => (
            <FormItem>
              <FormLabel>학교</FormLabel>
              <FormControl>
                <Input placeholder="학교 이름" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="personalInfoConsent"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>개인정보 수집 및 이용 동의</FormLabel>
                <FormMessage />
              </div>
            </FormItem>
          )}
        />
        <DialogFooter>
          <Button type="submit">사용자 추가</Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
