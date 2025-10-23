import { z } from "zod";

export const generalUserSchema = z.object({
  name: z.string().min(1, "이름이 필요합니다."),
  phoneNumber: z.string().min(1, "휴대폰 번호가 필요합니다."),
  gender: z.string().optional(),
  age: z.coerce.number().optional(),
  pin: z.string().min(4, "PIN은 4자리여야 합니다.").max(4, "PIN은 4자리여야 합니다."),
});
