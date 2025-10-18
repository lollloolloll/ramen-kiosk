import { z } from "zod";

export const rentalSchema = z.object({
  userId: z.string().min(1, "사용자 ID가 필요합니다."),
  ramenId: z.string(),
});
