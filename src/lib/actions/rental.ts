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
      // 2. .getTime()을 다시 추가하여 Date를 숫자로 변환합니다. (DB 컬럼이 INTEGER 타입이므로)
      whereConditions.push(
        gte(rentalRecords.rentalDate, filters.startDate.getTime())
      );
    }
    if (filters.endDate) {
      const endOfDay = new Date(filters.endDate);
      endOfDay.setHours(23, 59, 59, 999);
      // 2. .getTime()을 다시 추가하여 Date를 숫자로 변환합니다.
      whereConditions.push(lte(rentalRecords.rentalDate, endOfDay.getTime()));
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

    // Drizzle v0.29.0 이상에서는 dataQuery가 Promise가 아니므로 .execute()가 필요할 수 있습니다.
    // 하지만 현재 구조에서는 Promise.all이 잘 동작할 것입니다.
    const [data, total] = await Promise.all([dataQuery, countQuery]);

    const total_count = total[0].count;

    return { success: true, data, total_count };
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
