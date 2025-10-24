import { z } from "zod";

export const generalUserSchema = z.object({
  name: z.string().min(1, "이름을 입력해주세요."),
  phoneNumber: z.string().min(1, "휴대폰 번호를 입력해주세요."),
  gender: z.string().min(1, "성별을 선택해주세요."),
  birthDate: z.string().optional(),
  school: z.string().optional(),
  personalInfoConsent: z.boolean().refine((val) => val === true, {
    message: "개인정보 수집 및 이용에 동의해야 합니다.",
  }),
});
