import { z } from "zod";

export const generalUserSchema = z.object({
  name: z.string().min(1, "이름을 입력해주세요."),
  phoneNumber: z.string().min(1, "휴대폰 번호를 입력해주세요."),
  gender: z.string().min(1, "성별을 선택해주세요."),
  birthDate: z.string().min(1, "생년월일을 입력해주세요."),
  school: z.string().refine((val) => val.length > 0, {
    message: "학교를 선택하고 이름을 입력하거나 '해당없음'을 선택해주세요.",
  }),
  personalInfoConsent: z.boolean().optional(),
});
