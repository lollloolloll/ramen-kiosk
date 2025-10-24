"use server";

import { db } from "@/lib/db";
import { rentalRecords, ramens, generalUsers } from "@drizzle/schema";
import { eq, and, gte, lte, sql, InferInsertModel } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function rentRamen(userId: number, ramenId: number) {
  try {
    db.transaction((tx) => {
      const ramenToRent = tx
        .select()
        .from(ramens)
        .where(eq(ramens.id, ramenId))
        .get();

      if (!ramenToRent) {
        throw new Error("해당 라면을 찾을 수 없습니다.");
      }

      if (ramenToRent.stock <= 0) {
        throw new Error("재고가 부족합니다.");
      }

      tx.update(ramens)
        .set({ stock: ramenToRent.stock - 1 })
        .where(eq(ramens.id, ramenId))
        .run();

      tx.insert(rentalRecords)
        .values({
          userId: userId,
          ramenId: ramenId,
        })
        .run();
    });

    revalidatePath("/");
    revalidatePath("/admin/stock");
    revalidatePath("/admin/records");

    return { success: true };
  } catch (error) {
    console.error("Rental Transaction Failed:", error);
    return {
      error:
        error instanceof Error
          ? error.message
          : "대여 처리 중 예상치 못한 오류가 발생했습니다.",
    };
  }
}

export async function getRentalRecords(
  filters: {
    username?: string;
    startDate?: Date;
    endDate?: Date;
  } = {}
) {
  try {
    const whereConditions = [];

    if (filters.username) {
      whereConditions.push(eq(generalUsers.name, filters.username));
    }
    if (filters.startDate) {
      whereConditions.push(
        gte(rentalRecords.rentalDate, filters.startDate.getTime())
      );
    }
    if (filters.endDate) {
      whereConditions.push(
        lte(rentalRecords.rentalDate, filters.endDate.getTime())
      );
    }

    const query = db
      .select({
        id: rentalRecords.id,
        rentalDate: rentalRecords.rentalDate,
        userName: generalUsers.name,
        ramenName: ramens.name,
      })
      .from(rentalRecords)
      .leftJoin(generalUsers, eq(rentalRecords.userId, generalUsers.id))
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

function calculateAge(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export async function getRentalRecordsWithUserDetails() {
  try {
    const records = await db
      .select({
        id: rentalRecords.id,
        rentalDate: rentalRecords.rentalDate,
        userId: generalUsers.id,
        userName: generalUsers.name,
        userGender: generalUsers.gender,
        userBirthDate: generalUsers.birthDate, // birthDate를 가져옵니다.
        ramenName: ramens.name,
      })
      .from(rentalRecords)
      .leftJoin(generalUsers, eq(rentalRecords.userId, generalUsers.id))
      .leftJoin(ramens, eq(rentalRecords.ramenId, ramens.id));

    const data = records.map((record) => ({
      ...record,
      userAge: calculateAge(record.userBirthDate), // 나이를 계산합니다.
    }));

    return { success: true, data };
  } catch (error) {
    return { error: "상세 대여 기록을 불러오는 데 실패했습니다." };
  }
}
