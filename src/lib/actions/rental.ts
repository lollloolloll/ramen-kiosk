"use server";

import { db } from "@/lib/db";
import { rentalRecords, ramens, users } from "@/lib/db/schema";
import { rentalSchema } from "@/lib/validators/rental";
import { eq, gt, and, gte, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function executeRental(data: unknown) {
  const validatedData = rentalSchema.safeParse(data);
  if (!validatedData.success) {
    return { error: "유효하지 않은 데이터입니다." };
  }

  const { userId, ramenId } = validatedData.data;

  try {
    const result = await db.transaction(async (tx) => {
      const [ramenToRent] = await tx
        .select()
        .from(ramens)
        .where(eq(ramens.id, ramenId));

      if (!ramenToRent) {
        tx.rollback();
        return { error: "해당 라면을 찾을 수 없습니다." };
      }

      if (ramenToRent.stock <= 0) {
        tx.rollback();
        return { error: "재고가 부족합니다." };
      }

      await tx
        .update(ramens)
        .set({ stock: ramenToRent.stock - 1 })
        .where(eq(ramens.id, ramenId));

      await tx.insert(rentalRecords).values({
        userId,
        ramenId,
        rentalDate: new Date(),
      });

      return { success: true };
    });

    if (result.success) {
      revalidatePath("/"); // Revalidate the kiosk page
      revalidatePath("/admin/stock");
    }

    return result;
  } catch (error) {
    return { error: "대여 처리 중 오류가 발생했습니다." };
  }
}

export async function getRentalRecords(filters: {
  userId?: string;
  startDate?: Date;
  endDate?: Date;
} = {}) {
  try {
    const whereConditions = [];
    if (filters.userId) {
      whereConditions.push(eq(users.username, filters.userId)); // Assuming filtering by username
    }
    if (filters.startDate) {
      whereConditions.push(gte(rentalRecords.rentalDate, filters.startDate));
    }
    if (filters.endDate) {
      whereConditions.push(lte(rentalRecords.rentalDate, filters.endDate));
    }

    const query = db
      .select({
        id: rentalRecords.id,
        rentalDate: rentalRecords.rentalDate,
        userName: users.username,
        ramenName: ramens.name,
      })
      .from(rentalRecords)
      .leftJoin(users, eq(rentalRecords.userId, users.id))
      .leftJoin(ramens, eq(rentalRecords.ramenId, ramens.id));

    if (whereConditions.length > 0) {
      // @ts-ignore
      query.where(and(...whereConditions));
    }

    const data = await query;

    return { success: true, data };
  } catch (error) {
    return { error: "대여 기록을 불러오는 데 실패했습니다." };
  }
}
