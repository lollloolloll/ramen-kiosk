import { z } from "zod";

export const itemSchema = z.object({
  name: z.string().min(1, "이름을 입력해주세요."),
  category: z.string().min(1, "카테고리를 입력해주세요."),
  imageUrl: z.string().optional(),
});

export const updateItemSchema = z.object({
  id: z.number(),
  name: z.string().min(1, "이름을 입력해주세요.").optional(),
  category: z.string().min(1, "카테고리를 입력해주세요.").optional(),
  imageUrl: z.string().optional(),
});
