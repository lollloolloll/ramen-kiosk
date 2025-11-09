"use server";

import { db } from "@/lib/db";
import {
  rentalRecords,
  items,
  generalUsers,
  waitingQueue,
} from "@drizzle/schema";
import {
  eq,
  and,
  gte,
  lte,
  sql,
  asc,
  desc,
  like,
  count,
  countDistinct,
} from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { Workbook } from "exceljs";
import { AnalyticsData } from "@/lib/types/analytics";

export async function rentItem(
  userId: number,
  itemId: number,
  maleCount: number,
  femaleCount: number
) {
  try {
    // 1. 대여할 아이템 정보 조회 (시간제 대여 관련 속성 포함)
    const itemToRent = await db
      .select({
        id: items.id,
        name: items.name,
        category: items.category,
        isTimeLimited: items.isTimeLimited,
        rentalTimeMinutes: items.rentalTimeMinutes,
        maxRentalsPerUser: items.maxRentalsPerUser,
      })
      .from(items)
      .where(and(eq(items.id, itemId), eq(items.isDeleted, false)))
      .get();

    if (!itemToRent) {
      throw new Error("해당 아이템을 찾을 수 없습니다.");
    }

    // 2. 대여하는 사용자 정보 조회
    const userToRent = await db
      .select({
        id: generalUsers.id,
        name: generalUsers.name,
        phoneNumber: generalUsers.phoneNumber,
      })
      .from(generalUsers)
      .where(eq(generalUsers.id, userId))
      .get();

    if (!userToRent) {
      throw new Error("사용자 정보를 찾을 수 없습니다.");
    }

    // 3. 현재 대여 중인 아이템 수 확인 (재고 대신 사용)
    const currentRentals = await db
      .select({ count: sql<number>`count(*)` })
      .from(rentalRecords)
      .where(
        and(
          eq(rentalRecords.itemsId, itemId),
          eq(rentalRecords.isReturned, false)
        )
      )
      .get();

    const rentedCount = currentRentals?.count || 0;

    // 4. 사용자별 최대 대여 횟수 제한 확인 (시간제 대여 아이템에만 적용, 하루 기준)
    if (itemToRent.isTimeLimited && itemToRent.maxRentalsPerUser) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startOfDay = Math.floor(today.getTime() / 1000);

      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);
      const endOfDayTimestamp = Math.floor(endOfDay.getTime() / 1000);

      const userDailyRentals = await db
        .select({ count: sql<number>`count(*)` })
        .from(rentalRecords)
        .where(
          and(
            eq(rentalRecords.userId, userId),
            eq(rentalRecords.itemsId, itemId),
            gte(rentalRecords.rentalDate, startOfDay),
            lte(rentalRecords.rentalDate, endOfDayTimestamp)
          )
        )
        .get();

      if ((userDailyRentals?.count || 0) >= itemToRent.maxRentalsPerUser) {
        throw new Error("오늘 해당 아이템의 최대 대여 횟수를 초과했습니다.");
      }
    }

    // 5. 재고 확인 및 대기자 등록 로직
    if (rentedCount > 0) {
      // [추가] 사용자가 이미 해당 아이템의 대기열에 있는지 확인
      const existingWaiting = await db
        .select()
        .from(waitingQueue)
        .where(
          and(eq(waitingQueue.itemId, itemId), eq(waitingQueue.userId, userId))
        )
        .get();

      if (existingWaiting) {
        return {
          success: true,
          message: "이미 대기열에 등록되어 있습니다.",
        };
      }

      // 아이템이 이미 대여 중이므로 대기열에 추가
      await db.insert(waitingQueue).values({
        itemId: itemId,
        userId: userId,
        requestDate: Math.floor(Date.now() / 1000),
      });
      return {
        success: true,
        message: "아이템이 대여 중입니다. 대기열에 추가되었습니다.",
      };
    }

    // 6. 대여 기록 삽입
    const rentalDate = Math.floor(Date.now() / 1000);
    let returnDueDate: number | undefined = undefined;

    if (itemToRent.isTimeLimited && itemToRent.rentalTimeMinutes) {
      returnDueDate = rentalDate + itemToRent.rentalTimeMinutes * 60; // 분을 초로 변환
    }

    await db.insert(rentalRecords).values({
      userId: userId,
      itemsId: itemId,
      rentalDate: rentalDate,
      maleCount: maleCount,
      femaleCount: femaleCount,
      userName: userToRent.name,
      userPhone: userToRent.phoneNumber,
      itemName: itemToRent.name,
      itemCategory: itemToRent.category,
      returnDueDate: returnDueDate,
      isReturned: false, // 새로 대여하는 아이템은 반납되지 않은 상태
    });

    revalidatePath("/");
    revalidatePath("/admin/items");
    revalidatePath("/admin/records");

    return { success: true, message: "아이템 대여가 완료되었습니다." };
  } catch (error) {
    console.error("Rental Failed:", error);
    return {
      error:
        error instanceof Error
          ? error.message
          : "대여 처리 중 예상치 못한 오류가 발생했습니다.",
    };
  }
}
export async function returnItem(rentalRecordId: number) {
  try {
    // 1. 대여 기록을 반납 처리
    const [returnedRecord] = await db
      .update(rentalRecords)
      .set({
        isReturned: true,
        returnDate: Math.floor(Date.now() / 1000),
        isManualReturn: true, // 수동 반납으로 가정
      })
      .where(eq(rentalRecords.id, rentalRecordId))
      .returning();

    if (!returnedRecord || !returnedRecord.itemsId) {
      throw new Error("유효하지 않은 반납 기록이거나 아이템 정보가 없습니다.");
    }

    const itemId = returnedRecord.itemsId;
    const itemInfo = await db.query.items.findFirst({
      where: eq(items.id, itemId),
    });

    if (!itemInfo) {
      // 아이템 정보가 없으면 대기열 처리를 할 수 없으므로 여기서 종료
      console.warn(
        `아이템(ID: ${itemId}) 정보를 찾을 수 없어 대기열 처리를 건너뜁니다.`
      );
      revalidatePath("/admin/items");
      revalidatePath("/admin/records");
      return { success: true, message: "아이템 반납이 완료되었습니다." };
    }

    // 2. 다음 대기자를 찾아서 횟수 제한을 통과할 때까지 순차적으로 처리
    while (true) {
      const nextUserEntry = await db.query.waitingQueue.findFirst({
        where: eq(waitingQueue.itemId, itemId),
        orderBy: [asc(waitingQueue.requestDate)],
      });

      // 2-1. 더 이상 대기자가 없으면 루프 종료
      if (!nextUserEntry) {
        break;
      }

      // 2-2. 다음 대기자의 대여 자격 검증
      let isEligible = true;
      if (itemInfo.isTimeLimited && itemInfo.maxRentalsPerUser) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const startOfDay = Math.floor(today.getTime() / 1000);
        const endOfDay = new Date(today);
        endOfDay.setHours(23, 59, 59, 999);
        const endOfDayTimestamp = Math.floor(endOfDay.getTime() / 1000);

        const [result] = await db
          .select({ value: count() })
          .from(rentalRecords)
          .where(
            and(
              eq(rentalRecords.userId, nextUserEntry.userId),
              eq(rentalRecords.itemsId, itemId),
              gte(rentalRecords.rentalDate, startOfDay),
              lte(rentalRecords.rentalDate, endOfDayTimestamp)
            )
          );

        if (result.value >= itemInfo.maxRentalsPerUser) {
          isEligible = false;
        }
      }

      // 2-3. 대여 자격이 있는 경우, 자동 대여 처리
      if (isEligible) {
        const userToRent = await db.query.generalUsers.findFirst({
          where: eq(generalUsers.id, nextUserEntry.userId),
        });
        if (!userToRent) {
          // 사용자 정보가 없는 경우, 해당 대기열은 문제가 있으므로 삭제하고 다음으로 넘어감
          await db
            .delete(waitingQueue)
            .where(eq(waitingQueue.id, nextUserEntry.id));
          continue;
        }

        const rentalDate = Math.floor(Date.now() / 1000);
        let returnDueDate: number | undefined = undefined;
        if (itemInfo.isTimeLimited && itemInfo.rentalTimeMinutes) {
          returnDueDate = rentalDate + itemInfo.rentalTimeMinutes * 60;
        }

        await db.insert(rentalRecords).values({
          userId: nextUserEntry.userId,
          itemsId: itemId,
          rentalDate,
          returnDueDate,
          userName: userToRent.name,
          userPhone: userToRent.phoneNumber,
          itemName: itemInfo.name,
          itemCategory: itemInfo.category,
          isReturned: false,
        });

        await db
          .delete(waitingQueue)
          .where(eq(waitingQueue.id, nextUserEntry.id));
        console.log(
          `다음 대기자(ID: ${nextUserEntry.userId})에게 아이템이 자동으로 대여되었습니다.`
        );
        break; // 성공했으니 루프 종료
      }
      // 2-4. 대여 자격이 없는 경우 (횟수 초과), 대기열에서 제거하고 다음 사람 확인
      else {
        console.log(
          `다음 대기자(ID: ${nextUserEntry.userId})는 횟수 초과로 건너뜁니다.`
        );
        await db
          .delete(waitingQueue)
          .where(eq(waitingQueue.id, nextUserEntry.id));
        // 루프를 계속하여 다음 대기자 확인
      }
    }

    revalidatePath("/");
    revalidatePath("/admin/items");
    revalidatePath("/admin/records");
    revalidatePath("/admin/waitings");

    return {
      success: true,
      message: "아이템 반납 및 다음 대기자 처리가 완료되었습니다.",
    };
  } catch (error) {
    console.error("Return Item Failed:", error);
    return {
      error:
        error instanceof Error
          ? error.message
          : "아이템 반납 처리 중 오류가 발생했습니다.",
    };
  }
}

export async function processExpiredRentals() {
  try {
    const now = Math.floor(Date.now() / 1000);

    // 1. 만료되었지만 아직 반납되지 않은 시간제 대여 기록 조회
    const expiredRentals = await db
      .select()
      .from(rentalRecords)
      .where(
        and(
          eq(rentalRecords.isReturned, false),
          sql`${rentalRecords.returnDueDate} IS NOT NULL`,
          lte(rentalRecords.returnDueDate, now)
        )
      );

    if (expiredRentals.length === 0) {
      console.log("No expired rentals to process.");
      return { success: true, message: "처리할 만료된 대여가 없습니다." };
    }

    // 2. 각 만료된 대여 기록을 반납 처리
    const updatePromises = expiredRentals.map((record) =>
      db
        .update(rentalRecords)
        .set({
          isReturned: true,
          returnDate: record.returnDueDate, // 만료 시간을 반납 시간으로 설정
          isManualReturn: false, // 시스템에 의한 자동 반납
        })
        .where(eq(rentalRecords.id, record.id))
    );

    await Promise.all(updatePromises);

    // 3. 관련 경로 재검증
    revalidatePath("/");
    revalidatePath("/admin/items");
    revalidatePath("/admin/records");

    console.log(`Processed ${expiredRentals.length} expired rentals.`);
    return {
      success: true,
      message: `${expiredRentals.length}개의 만료된 대여를 처리했습니다.`,
    };
  } catch (error) {
    console.error("Error processing expired rentals:", error);
    return {
      error:
        error instanceof Error
          ? error.message
          : "만료된 대여 처리 중 예상치 못한 오류가 발생했습니다.",
    };
  }
}

// src/lib/actions/rental.ts
export async function getAvailableRentalYears() {
  try {
    // 1. DB에서는 날짜 계산 없이 raw 타임스탬프 값만 모두 가져옵니다.
    const allDatesResult = await db
      .selectDistinct({ rentalDate: rentalRecords.rentalDate })
      .from(rentalRecords);

    if (!allDatesResult) {
      return { success: true, data: [] };
    }

    // 2. JavaScript의 Date 객체를 사용하여 연도를 계산합니다.
    //    Set을 사용하여 중복을 자동으로 제거합니다.
    const yearsSet = new Set<number>();
    allDatesResult.forEach((record) => {
      if (record.rentalDate) {
        const year = new Date(record.rentalDate * 1000).getUTCFullYear();
        if (!isNaN(year)) {
          yearsSet.add(year);
        }
      }
    });

    // 3. Set을 배열로 변환하고 내림차순으로 정렬합니다.
    const sortedYears = Array.from(yearsSet).sort((a, b) => b - a);

    return { success: true, data: sortedYears };
  } catch (error) {
    console.error("Error fetching available rental years:", error);
    return { error: "사용 가능한 대여 연도를 불러오는 데 실패했습니다." };
  }
}

export async function getAllItemNames() {
  try {
    const itemNames = await db
      .selectDistinct({ name: items.name })
      .from(items)
      .where(and(sql`${items.name} IS NOT NULL`, eq(items.isDeleted, false))); // Ensure only non-deleted items with names are returned

    return { success: true, data: itemNames.map((item) => item.name) };
  } catch (error) {
    console.error("Error fetching all item names:", error);
    return { error: "물품명을 불러오는 데 실패했습니다." };
  }
}

export async function getRentalRecords(
  filters: {
    username?: string;
    startDate?: string;
    endDate?: string;
    itemName?: string;
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
      const [year, month, day] = filters.startDate.split("-").map(Number);
      const startOfDay = new Date(Date.UTC(year, month - 1, day));
      whereConditions.push(
        gte(rentalRecords.rentalDate, Math.floor(startOfDay.getTime() / 1000))
      );
    }
    if (filters.endDate) {
      const [year, month, day] = filters.endDate.split("-").map(Number);
      const date = new Date(Date.UTC(year, month - 1, day));
      date.setUTCHours(23, 59, 59, 999);
      whereConditions.push(
        lte(rentalRecords.rentalDate, Math.floor(date.getTime() / 1000))
      );
    }
    if (filters.itemName) {
      whereConditions.push(eq(items.name, filters.itemName));
    }

    const baseQuery = db
      .select({
        id: rentalRecords.id,
        rentalDate: rentalRecords.rentalDate,
        userId: generalUsers.id,
        userName: sql<string>`COALESCE(${generalUsers.name}, ${rentalRecords.userName})`,
        userPhone: sql<string>`COALESCE(${generalUsers.phoneNumber}, ${rentalRecords.userPhone})`,
        itemName: sql<string>`COALESCE(${items.name}, ${rentalRecords.itemName})`,
        itemCategory: sql<string>`COALESCE(${items.category}, ${rentalRecords.itemCategory})`,
        maleCount: rentalRecords.maleCount,
        femaleCount: rentalRecords.femaleCount,
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
        maleCount: rentalRecords.maleCount,
        femaleCount: rentalRecords.femaleCount,
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

    const total_count = total[0]?.count || 0;

    return { success: true, data, total_count };
  } catch (error) {
    console.error("Error fetching rental records:", error);
    return { error: "대여 기록을 불러오는 데 실패했습니다." };
  }
}
export async function getRentalRecordsByUserId(
  userId: number,
  filters: {
    startDate?: string;
    endDate?: string;
    itemName?: string;
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

    const whereConditions = [eq(rentalRecords.userId, userId)];
    if (filters.startDate) {
      const startOfDay = new Date(filters.startDate);
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
    if (filters.itemName) {
      whereConditions.push(eq(items.name, filters.itemName));
    }

    // --- 데이터 조회 쿼리 ---
    const sortColumnMap = {
      rentalDate: rentalRecords.rentalDate,
      username: generalUsers.name,
      itemName: items.name,
      maleCount: rentalRecords.maleCount,
      femaleCount: rentalRecords.femaleCount,
    };
    const sortColumn =
      sortColumnMap[sort as keyof typeof sortColumnMap] ||
      rentalRecords.rentalDate;

    // ✅ Solution: Build the complete query in one chain instead of reassigning
    const dataQuery = db
      .select({
        id: rentalRecords.id,
        rentalDate: rentalRecords.rentalDate,
        userName: sql<string>`COALESCE(${generalUsers.name}, ${rentalRecords.userName})`,
        itemName: sql<string>`COALESCE(${items.name}, ${rentalRecords.itemName})`,
        itemCategory: sql<string>`COALESCE(${items.category}, ${rentalRecords.itemCategory})`,
        maleCount: rentalRecords.maleCount,
        femaleCount: rentalRecords.femaleCount,
        imageUrl: items.imageUrl,
      })
      .from(rentalRecords)
      .leftJoin(generalUsers, eq(rentalRecords.userId, generalUsers.id))
      .leftJoin(items, eq(rentalRecords.itemsId, items.id))
      .where(and(...whereConditions))
      .limit(per_page)
      .offset(offset)
      .orderBy(order === "asc" ? asc(sortColumn) : desc(sortColumn));

    // --- 카운트 조회 쿼리 ---
    const countQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(rentalRecords)
      .leftJoin(generalUsers, eq(rentalRecords.userId, generalUsers.id))
      .leftJoin(items, eq(rentalRecords.itemsId, items.id))
      .where(and(...whereConditions));

    // 병렬 실행
    const [data, total] = await Promise.all([dataQuery, countQuery]);

    const total_count = total[0]?.count || 0;

    return { success: true, data, total_count };
  } catch (error) {
    console.error("Error fetching rental records by user ID:", error);
    return { error: "사용자 대여 기록을 불러오는 데 실패했습니다." };
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

// 분석 데이터를 가져오는 메인 함수 (리팩토링 버전)
export async function getRentalAnalytics(filters: {
  year: string;
  month: string | "all";
  ageGroup?: string;
  category?: string;
}): Promise<AnalyticsData> {
  const { year, month, ageGroup, category } = filters;

  try {
    const whereConditions = [];

    const yearNum = parseInt(year);
    if (isNaN(yearNum)) {
      // 유효하지 않은 연도 입력 시 빈 데이터 반환 또는 에러 처리
      throw new Error(`Invalid year provided: ${year}`);
    }

    const startMonth = month === "all" ? 0 : parseInt(month) - 1;
    const startDate = new Date(Date.UTC(yearNum, startMonth, 1));
    const endDate = new Date(startDate);
    if (month === "all") {
      endDate.setUTCFullYear(yearNum + 1);
    } else {
      endDate.setUTCMonth(startMonth + 1);
    }
    endDate.setUTCDate(0);
    endDate.setUTCHours(23, 59, 59, 999);

    const startTimestamp = Math.floor(startDate.getTime() / 1000);
    const endTimestamp = Math.floor(endDate.getTime() / 1000);

    whereConditions.push(gte(rentalRecords.rentalDate, startTimestamp));
    whereConditions.push(lte(rentalRecords.rentalDate, endTimestamp));

    if (category && category !== "all") {
      whereConditions.push(eq(items.category, category));
    }

    const baseQuery = db
      .select({
        rentalDate: rentalRecords.rentalDate,
        userId: rentalRecords.userId,
        birthDate: generalUsers.birthDate,
        gender: generalUsers.gender,
        school: generalUsers.school,
        itemName: items.name,
        itemId: items.id,
        itemCategory: items.category,
        peopleCount: sql<number>`${rentalRecords.maleCount} + ${rentalRecords.femaleCount}`,
      })
      .from(rentalRecords)
      .leftJoin(generalUsers, eq(rentalRecords.userId, generalUsers.id))
      .leftJoin(items, eq(rentalRecords.itemsId, items.id))
      .where(and(...whereConditions));

    let records = await baseQuery;

    records = records.map((r) => ({
      ...r,
      school: r.school ?? "기타",
      peopleCount: r.peopleCount || 0,
    }));

    if (ageGroup && ageGroup !== "all") {
      records = records.filter((r) => {
        if (!r.birthDate) return false;
        const age = calculateAge(r.birthDate);
        if (age === null) return false;
        if (ageGroup === "child" && age <= 12) return true;
        if (ageGroup === "teen" && age > 12 && age <= 18) return true;
        if (ageGroup === "adult" && age > 18) return true;
        return false;
      });
    }

    const totalRentals = records.length;
    const uniqueUsers = new Set(records.map((r) => r.userId)).size;

    const itemCounts = records.reduce((acc, r) => {
      if (r.itemId) {
        acc[r.itemId] = acc[r.itemId] || {
          id: r.itemId,
          name: r.itemName,
          category: r.itemCategory || "Unknown",
          rentals: 0,
        };
        acc[r.itemId].rentals++;
      }
      return acc;
    }, {} as Record<number, { id: number; name: string | null; category: string; rentals: number }>);

    const mostPopularItem =
      Object.values(itemCounts).sort((a, b) => b.rentals - a.rentals)[0] ||
      null;

    const categoryCounts = records.reduce((acc, r) => {
      if (r.itemCategory) {
        acc[r.itemCategory] = acc[r.itemCategory] || {
          name: r.itemCategory,
          rentals: 0,
        };
        acc[r.itemCategory].rentals++;
      }
      return acc;
    }, {} as Record<string, { name: string; rentals: number }>);

    const mostPopularCategory =
      Object.values(categoryCounts).sort((a, b) => b.rentals - a.rentals)[0] ||
      null;

    const ageGroupStats = {
      child: { count: 0, uniqueUsers: new Set<number | null>() },
      teen: { count: 0, uniqueUsers: new Set<number | null>() },
      adult: { count: 0, uniqueUsers: new Set<number | null>() },
    };
    records.forEach((r) => {
      if (r.birthDate) {
        const age = calculateAge(r.birthDate);
        if (age !== null) {
          if (age <= 12) {
            ageGroupStats.child.count++;
            ageGroupStats.child.uniqueUsers.add(r.userId);
          } else if (age <= 18) {
            ageGroupStats.teen.count++;
            ageGroupStats.teen.uniqueUsers.add(r.userId);
          } else {
            ageGroupStats.adult.count++;
            ageGroupStats.adult.uniqueUsers.add(r.userId);
          }
        }
      }
    });

    const categoryStats = Object.entries(categoryCounts)
      .map(([name, data]) => {
        const itemsInCategory = records.filter((r) => r.itemCategory === name);
        const topItemsInCategory = Object.values(
          itemsInCategory.reduce((acc, r) => {
            if (r.itemId) {
              acc[r.itemId] = acc[r.itemId] || {
                itemId: r.itemId,
                itemName: r.itemName || "Unknown",
                rentals: 0,
              };
              acc[r.itemId].rentals++;
            }
            return acc;
          }, {} as Record<number, { itemId: number; itemName: string; rentals: number }>)
        ).sort((a, b) => b.rentals - a.rentals);

        return {
          category: name,
          totalRentals: data.rentals,
          percentage:
            totalRentals > 0 ? (data.rentals / totalRentals) * 100 : 0,
          topItems: topItemsInCategory.slice(0, 5),
        };
      })
      .sort((a, b) => b.totalRentals - a.totalRentals);

    const allItemCounts = Object.values(itemCounts).sort(
      (a, b) => b.rentals - a.rentals
    );
    const topItems = allItemCounts.slice(0, 10);
    const unpopularItems = allItemCounts
      .filter((item) => item.rentals <= 5)
      .reverse();

    const dayOfWeekStats = Array(7)
      .fill(0)
      .map((_, i) => ({
        name: ["일", "월", "화", "수", "목", "금", "토"][i],
        count: 0,
      }));
    const hourStats = Array(24)
      .fill(0)
      .map((_, i) => ({ name: `${i}시`, count: 0 }));
    records.forEach((r) => {
      const date = new Date(r.rentalDate * 1000);
      dayOfWeekStats[date.getDay()].count++;
      hourStats[date.getHours()].count++;
    });

    const genderCounts = { male: 0, female: 0, other: 0 };
    records.forEach((r) => {
      if (r.gender) {
        if (r.gender === "남" || r.gender.toLowerCase() === "male")
          genderCounts.male++;
        else if (r.gender === "여" || r.gender.toLowerCase() === "female")
          genderCounts.female++;
        else genderCounts.other++;
      }
    });
    const genderStats = [
      { name: "남성", value: genderCounts.male },
      { name: "여성", value: genderCounts.female },
      { name: "기타", value: genderCounts.other },
    ].filter((g) => g.value > 0);

    const schoolCounts: {
      [school: string]: {
        school: string;
        totalRentals: number;
        users: Set<number>;
      };
    } = {};
    records.forEach((r) => {
      if (r.userId && r.school) {
        if (!schoolCounts[r.school]) {
          schoolCounts[r.school] = {
            school: r.school,
            totalRentals: 0,
            users: new Set(),
          };
        }
        schoolCounts[r.school].totalRentals += 1;
        schoolCounts[r.school].users.add(r.userId);
      }
    });
    const schoolRankings = Object.values(schoolCounts)
      .map((item) => ({
        school: item.school,
        totalRentals: item.totalRentals,
        uniqueUsers: item.users.size,
      }))
      .sort((a, b) => b.totalRentals - a.totalRentals);

    const peopleItemStats: {
      [key: number]: {
        [itemId: number]: { itemId: number; itemName: string; rentals: number };
      };
    } = {};
    records.forEach((r) => {
      const p = r.peopleCount || 0;
      if (!peopleItemStats[p]) peopleItemStats[p] = {};
      if (r.itemId && typeof r.itemId === "number" && r.itemName) {
        if (!peopleItemStats[p][r.itemId]) {
          peopleItemStats[p][r.itemId] = {
            itemId: r.itemId,
            itemName: r.itemName,
            rentals: 0,
          };
        }
        peopleItemStats[p][r.itemId].rentals++;
      }
    });
    const peopleCountItemStats = Object.keys(peopleItemStats).map((count) => ({
      peopleCount: Number(count),
      items: Object.values(peopleItemStats[Number(count)]).sort(
        (a, b) => b.rentals - a.rentals
      ) as { itemId: number; itemName: string; rentals: number }[],
    }));

    return {
      kpis: { totalRentals, uniqueUsers, mostPopularItem, mostPopularCategory },
      ageGroupStats: {
        child: {
          count: ageGroupStats.child.count,
          uniqueUsers: ageGroupStats.child.uniqueUsers.size,
          percentage:
            totalRentals > 0
              ? (ageGroupStats.child.count / totalRentals) * 100
              : 0,
        },
        teen: {
          count: ageGroupStats.teen.count,
          uniqueUsers: ageGroupStats.teen.uniqueUsers.size,
          percentage:
            totalRentals > 0
              ? (ageGroupStats.teen.count / totalRentals) * 100
              : 0,
        },
        adult: {
          count: ageGroupStats.adult.count,
          uniqueUsers: ageGroupStats.adult.uniqueUsers.size,
          percentage:
            totalRentals > 0
              ? (ageGroupStats.adult.count / totalRentals) * 100
              : 0,
        },
      },
      categoryStats,
      itemStats: { topItems, unpopularItems },
      dayOfWeekStats,
      hourStats,
      genderStats,
      schoolRankings,
      peopleCountItemStats,
    };
  } catch (error) {
    console.error("Error fetching rental analytics:", error);
    return {
      kpis: {
        totalRentals: 0,
        uniqueUsers: 0,
        mostPopularItem: null,
        mostPopularCategory: null,
      },
      ageGroupStats: {
        child: { count: 0, uniqueUsers: 0, percentage: 0 },
        teen: { count: 0, uniqueUsers: 0, percentage: 0 },
        adult: { count: 0, uniqueUsers: 0, percentage: 0 },
      },
      categoryStats: [],
      itemStats: { topItems: [], unpopularItems: [] },
      dayOfWeekStats: [],
      hourStats: [],
      genderStats: [],
      schoolRankings: [],
      peopleCountItemStats: [],
    };
  }
}

export async function exportRentalRecordsToExcel(
  filters: {
    username?: string;
    startDate?: string;
    endDate?: string;
    itemName?: string;
  } = {}
) {
  try {
    // 페이지네이션 없이 필터링된 모든 대여 기록을 가져옵니다.
    const { data, error } = await getRentalRecords({
      ...filters,
      per_page: 999999,
    }); // 매우 큰 값으로 설정하여 모든 데이터를 가져옴

    if (error || !data) {
      throw new Error(error || "대여 기록을 가져오는 데 실패했습니다.");
    }

    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet("쌍청문 쉬다 대여 기록");

    // 헤더 설정
    worksheet.columns = [
      { header: "ID", key: "id", width: 10 },
      { header: "대여 날짜", key: "rentalDate", width: 20 },
      { header: "사용자 이름", key: "userName", width: 15 },
      { header: "아이템 이름", key: "itemName", width: 20 },
      { header: "아이템 카테고리", key: "itemCategory", width: 15 },
      { header: "남자 인원", key: "maleCount", width: 10 },
      { header: "여자 인원", key: "femaleCount", width: 10 },
    ];

    // 데이터 추가
    data.forEach((record) => {
      worksheet.addRow({
        id: record.id,
        rentalDate: new Date(record.rentalDate * 1000).toLocaleString("ko-KR"), // UNIX 타임스탬프를 사람이 읽기 쉬운 형식으로 변환
        userName: record.userName,
        itemName: record.itemName,
        itemCategory: record.itemCategory,
        maleCount: record.maleCount,
        femaleCount: record.femaleCount,
      });
    });

    // 엑셀 파일을 버퍼로 생성
    const buffer = await (workbook.xlsx as any).writeBuffer();

    // 클라이언트로 반환할 수 있도록 버퍼와 MIME 타입 반환
    return {
      success: true,
      buffer: buffer.toString("base64"),
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    };
  } catch (error) {
    console.error("Error exporting rental records to Excel:", error);
    return {
      error:
        error instanceof Error
          ? error.message
          : "엑셀 내보내기 중 오류가 발생했습니다.",
    };
  }
}

export async function deleteRentalRecord(recordId: number) {
  try {
    await db.delete(rentalRecords).where(eq(rentalRecords.id, recordId));
    revalidatePath("/admin/records");
    return { success: true, message: "대여 기록이 삭제되었습니다." };
  } catch (error) {
    console.error("Delete Rental Record Failed:", error);
    return {
      error:
        error instanceof Error
          ? error.message
          : "대여 기록 삭제 중 오류가 발생했습니다.",
    };
  }
}

export async function getActiveRentalsWithWaitCount() {
  try {
    const waitCountSubquery = db
      .select({
        itemId: waitingQueue.itemId,
        count: sql<number>`count(*)`.as("wait_count"),
      })
      .from(waitingQueue)
      .groupBy(waitingQueue.itemId)
      .as("wait_counts");

    const activeRentals = await db
      .select({
        recordId: rentalRecords.id,
        itemName: items.name,
        userName: generalUsers.name,
        rentalDate: rentalRecords.rentalDate,
        returnDueDate: rentalRecords.returnDueDate,
        waitCount: sql<number>`COALESCE(${waitCountSubquery.count}, 0)`.mapWith(
          Number
        ),
        itemsId: rentalRecords.itemsId,
      })
      .from(rentalRecords)
      .leftJoin(items, eq(rentalRecords.itemsId, items.id))
      .leftJoin(generalUsers, eq(rentalRecords.userId, generalUsers.id))
      .leftJoin(
        waitCountSubquery,
        eq(rentalRecords.itemsId, waitCountSubquery.itemId)
      )
      .where(
        and(
          eq(items.isTimeLimited, true),
          eq(rentalRecords.isReturned, false)
        )
      );

    return { success: true, data: activeRentals };
  } catch (error) {
    console.error("Error fetching active rentals with wait count:", error);
    return {
      error: "활성 대여 목록을 불러오는 데 실패했습니다.",
    };
  }
}

export async function extendRentalTime(rentalRecordId: number) {
  try {
    const rentalRecord = await db.query.rentalRecords.findFirst({
      where: eq(rentalRecords.id, rentalRecordId),
    });

    if (!rentalRecord || !rentalRecord.itemsId || !rentalRecord.returnDueDate) {
      throw new Error(
        "연장할 대여 기록을 찾을 수 없거나, 연장 가능한 항목이 아닙니다."
      );
    }

    const itemId = rentalRecord.itemsId;

    const item = await db.query.items.findFirst({
      where: eq(items.id, itemId),
    });

    if (!item || !item.isTimeLimited || !item.rentalTimeMinutes) {
      throw new Error(
        "연장할 아이템 정보를 찾을 수 없거나, 시간제 대여 아이템이 아닙니다."
      );
    }

    const waitingUser = await db.query.waitingQueue.findFirst({
      where: eq(waitingQueue.itemId, itemId),
    });

    if (waitingUser) {
      throw new Error("대기자가 있어 연장할 수 없습니다.");
    }

    const newReturnDueDate =
      rentalRecord.returnDueDate + item.rentalTimeMinutes * 60;

    await db
      .update(rentalRecords)
      .set({ returnDueDate: newReturnDueDate })
      .where(eq(rentalRecords.id, rentalRecordId));

    revalidatePath("/admin/waitings");

    return { success: true, message: "대여 시간이 연장되었습니다." };
  } catch (error) {
    console.error("Extend Rental Time Failed:", error);
    return {
      error:
        error instanceof Error
          ? error.message
          : "대여 시간 연장 중 오류가 발생했습니다.",
    };
  }
}
