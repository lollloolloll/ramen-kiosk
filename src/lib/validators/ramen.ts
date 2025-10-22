import { z } from "zod";

export const ramenSchema = z.object({
  name: z.string().min(1, "이름을 입력해주세요."),
  manufacturer: z.string().min(1, "제조사를 입력해주세요."),
  stock: z.coerce.number().int().min(0, "재고는 0 이상이어야 합니다."),
  imageUrl: z.string().url("유효한 URL을 입력해주세요.").optional().or(z.literal("")),
});

export const updateRamenSchema = z.object({
  id: z.number(),
  name: z.string().min(1, "이름을 입력해주세요.").optional(),
  manufacturer: z.string().min(1, "제조사를 입력해주세요.").optional(),
  stock: z.coerce.number().int().min(0, "재고는 0 이상이어야 합니다.").optional(),
  imageUrl: z.string().url("유효한 URL을 입력해주세요.").optional().or(z.literal("")),
});
