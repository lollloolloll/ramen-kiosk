"use server";

import { db } from "@/lib/db";
import { rentalRecords, items, generalUsers } from "@drizzle/schema";
import { eq, and, gte, lte, sql, asc, desc, like } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function rentItem(userId: number, itemId: number) {
  try {
    await db.transaction(async (tx) => {
      const itemToRent = await tx
        .select()
        .from(items)
        .where(eq(items.id, itemId))
        .get();

      if (!itemToRent) {
        throw new Error("해당 아이템을 찾을 수 없습니다.");
      }

      await tx.insert(rentalRecords).values({
        userId: userId,
        itemsId: itemId,
      });
    });

    revalidatePath("/");
    revalidatePath("/admin/items");
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
    category?: string;
    page?: number;
    per_page?: number;
    sort?: string;
    order?: string;
  } = {}
) {
  try {
    const {
      page = 1,
      per_page = 10,
      sort = "rentalDate",
      order = "desc",
    } = filters;
    const offset = (page - 1) * per_page;

    const whereConditions = [];
    if (filters.username) {
      whereConditions.push(like(generalUsers.name, `%${filters.username}%`));
    }
    if (filters.startDate) {
      const startOfDay = new Date(filters.startDate);
      startOfDay.setHours(0, 0, 0, 0);
      whereConditions.push(
        gte(rentalRecords.rentalDate, Math.floor(startOfDay.getTime() / 1000))
      );
    }
    if (filters.endDate) {
      const endOfDay = new Date(filters.endDate);
      endOfDay.setHours(23, 59, 59, 999);
      whereConditions.push(
        lte(rentalRecords.rentalDate, Math.floor(endOfDay.getTime() / 1000))
      );
    }
    if (filters.category) {
      whereConditions.push(eq(items.category, filters.category));
    }

    const baseQuery = db
      .select({
        id: rentalRecords.id,
        rentalDate: rentalRecords.rentalDate,
        userName: generalUsers.name,
        itemName: items.name,
        itemCategory: items.category,
      })
      .from(rentalRecords)
      .leftJoin(generalUsers, eq(rentalRecords.userId, generalUsers.id))
      .leftJoin(items, eq(rentalRecords.itemsId, items.id));

    const filteredQuery =
      whereConditions.length > 0
        ? baseQuery.where(and(...whereConditions))
        : baseQuery;

    const dataQuery = filteredQuery.limit(per_page).offset(offset);

    if (sort) {
      const sortColumnMap = {
        rentalDate: rentalRecords.rentalDate,
        username: generalUsers.name,
        itemName: items.name,
      };
      const sortColumn =
        sortColumnMap[sort as keyof typeof sortColumnMap] ||
        rentalRecords.rentalDate;
      dataQuery.orderBy(order === "asc" ? asc(sortColumn) : desc(sortColumn));
    }

    const countQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(rentalRecords)
      .leftJoin(generalUsers, eq(rentalRecords.userId, generalUsers.id))
      .leftJoin(items, eq(rentalRecords.itemsId, items.id))
      .where(and(...whereConditions));

    const [data, total] = await Promise.all([dataQuery, countQuery]);

    // total 배열이 비어있을 경우를 대비한 안전장치
    const total_count = total[0]?.count || 0;

    return { success: true, data, total_count };
    // ▼▼▼ 여기에 catch 블록 추가 ▼▼▼
  } catch (error) {
    console.error("Error fetching rental records:", error);
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
        itemName: items.name,
      })
      .from(rentalRecords)
      .leftJoin(generalUsers, eq(rentalRecords.userId, generalUsers.id))
      .leftJoin(items, eq(rentalRecords.itemsId, items.id));

    const data = records.map((record) => ({
      ...record,
      userAge: calculateAge(record.userBirthDate), // 나이를 계산합니다.
    }));

    return { success: true, data };
  } catch (error) {
    return { error: "상세 대여 기록을 불러오는 데 실패했습니다." };
  }
}
