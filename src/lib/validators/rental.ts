import { z } from "zod";

export const rentalSchema = z.object({
  userId: z.number().min(1, "사용자 ID가 필요합니다."),
  ramenId: z.number(),
});

export const pinRentalSchema = z.object({
  ramenId: z.number(),
  phoneNumber: z.string().min(1, "휴대폰 번호가 필요합니다."),
  pin: z.string().min(4, "PIN은 4자리여야 합니다.").max(4, "PIN은 4자리여야 합니다."),
});
