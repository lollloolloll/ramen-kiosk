"use server";

import { db } from "@/lib/db";
import {
  rentalRecords,
  items,
  generalUsers,
  waitingQueue,
  rentalRecordPeople,
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
  or,
  inArray,
} from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { Workbook } from "exceljs";
import { AnalyticsData } from "@/lib/types/analytics";
export async function rentItem(
  userId: number,
  itemId: number,
  maleCount: number,
  femaleCount: number,
  participants?: Array<{ name: string; gender: "남" | "여" }>
) {
  await triggerExpiredRentalsCheck();
  try {
    // 1. 대여할 아이템 정보 조회
    const itemToRent = await db
      .select({
        id: items.id,
        name: items.name,
        category: items.category,
        isTimeLimited: items.isTimeLimited,
        rentalTimeMinutes: items.rentalTimeMinutes,
        maxRentalsPerUser: items.maxRentalsPerUser,
        enableParticipantTracking: items.enableParticipantTracking,
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

    // [핵심 수정] 3. 시간제 아이템에만 적용되는 검증 로직
    if (itemToRent.isTimeLimited) {
      // 3-1. 재고 확인: 현재 대여 중인 기록이 있는지 확인
      const currentRental = await db
        .select({ id: rentalRecords.id })
        .from(rentalRecords)
        .where(
          and(
            eq(rentalRecords.itemsId, itemId),
            eq(rentalRecords.isReturned, false)
          )
        )
        .limit(1)
        .get();

      if (currentRental) {
        throw new Error("이미 다른 사람이 대여 중인 아이템입니다.");
      }

      // 3-2. 사용자별 최대 대여 횟수 제한 확인 (하루 기준)
      if (itemToRent.maxRentalsPerUser) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const startOfDay = Math.floor(today.getTime() / 1000);
        const endOfDay = new Date(today);
        endOfDay.setHours(23, 59, 59, 999);
        const endOfDayTimestamp = Math.floor(endOfDay.getTime() / 1000);

        const [userDailyRentals] = await db
          .select({ count: sql<number>`count(*)` })
          .from(rentalRecords)
          .where(
            and(
              eq(rentalRecords.userId, userId),
              eq(rentalRecords.itemsId, itemId),
              gte(rentalRecords.rentalDate, startOfDay),
              lte(rentalRecords.rentalDate, endOfDayTimestamp)
            )
          );

        if ((userDailyRentals?.count || 0) >= itemToRent.maxRentalsPerUser) {
          throw new Error("오늘 해당 아이템의 최대 대여 횟수를 초과했습니다.");
        }
      }
    }
    // 일반 아이템(isTimeLimited: false)은 위의 모든 검증 로직을 건너뜁니다.

    // 4. 대여 기록 삽입
    const rentalDate = Math.floor(Date.now() / 1000);
    let returnDueDate: number | undefined = undefined;

    if (itemToRent.isTimeLimited && itemToRent.rentalTimeMinutes) {
      returnDueDate = rentalDate + itemToRent.rentalTimeMinutes * 60;
    }

    const [newRental] = await db
      .insert(rentalRecords)
      .values({
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
        isReturned: false,
      })
      .returning({ id: rentalRecords.id });

    // 5. 참여자 정보 저장 (enableParticipantTracking이 true인 경우에만)
    if (
      itemToRent.enableParticipantTracking &&
      participants &&
      participants.length > 0 &&
      newRental?.id
    ) {
      // 빈 이름은 제외하고 저장
      const validParticipants = participants.filter(
        (p) => p.name.trim() !== ""
      );

      if (validParticipants.length > 0) {
        await db.insert(rentalRecordPeople).values(
          validParticipants.map((participant) => ({
            rentalRecordId: newRental.id,
            name: participant.name.trim(),
            gender: participant.gender,
          }))
        );
      }
    }

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
  await processAndMutateExpiredRentals();
  try {
    const [returnedRecord] = await db
      .update(rentalRecords)
      .set({
        isReturned: true,
        returnDate: Math.floor(Date.now() / 1000),
        isManualReturn: true,
      })
      .where(eq(rentalRecords.id, rentalRecordId))
      .returning();

    if (!returnedRecord || !returnedRecord.itemsId) {
      throw new Error("유효하지 않은 반납 기록이거나 아이템 정보가 없습니다.");
    }

    // 분리된 다음 대기자 처리 함수 호출
    await processNextInQueue(returnedRecord.itemsId);

    revalidatePath("/", "layout"); // 전체 경로 리프레시
    return {
      success: true,
      message: "아이템 반납 및 다음 대기자 처리가 완료되었습니다.",
    };
  } catch (error) {
    console.error("ReturnFailed", error);
    return {
      error:
        error instanceof Error
          ? error.message
          : "반납 중 예상치 못한 오류가 발생했습니다.",
    };
  }
}
/**
 * [내부 사용 주의] DB의 만료된 대여 기록을 처리하지만, 캐시는 갱신하지 않습니다.
 * 렌더링 중에 안전하게 호출할 수 있습니다. (예: getAllItems)
 * 서버 액션에서는 이 함수 대신 triggerExpiredRentalsCheck를 사용하세요.
 * @returns {Promise<boolean>} DB 변경 여부
 */
export async function processAndMutateExpiredRentals(): Promise<boolean> {
  try {
    const now = Math.floor(Date.now() / 1000);

    const expiredRentals = await db
      .select({
        id: rentalRecords.id,
        itemsId: rentalRecords.itemsId,
        returnDueDate: rentalRecords.returnDueDate,
      })
      .from(rentalRecords)
      .where(
        and(
          eq(rentalRecords.isReturned, false),
          sql`${rentalRecords.returnDueDate} IS NOT NULL`,
          lte(rentalRecords.returnDueDate, now)
        )
      );

    if (expiredRentals.length === 0) {
      return false; // 변경된 내용이 없음을 알림
    }

    console.log(
      `Silently processing ${expiredRentals.length} expired rentals...`
    );

    for (const record of expiredRentals) {
      await db
        .update(rentalRecords)
        .set({
          isReturned: true,
          returnDate: record.returnDueDate,
          isManualReturn: false,
        })
        .where(eq(rentalRecords.id, record.id));

      if (record.itemsId) {
        await processNextInQueue(record.itemsId);
      }
    }

    return true; // 변경된 내용이 있음을 알림
  } catch (error) {
    console.error("Error during silent mutation of expired rentals:", error);
    return false;
  }
}

// [신규] 2. revalidatePath만 담당하는 "알림용" 래퍼 함수 (서버 액션용)
/**
 * 만료된 대여를 확인하고, 변경사항이 있으면 캐시(revalidatePath)까지 갱신합니다.
 * **반드시 서버 액션 안에서만 사용하세요.**
 */
export async function triggerExpiredRentalsCheck() {
  const hasChanges = await processAndMutateExpiredRentals();
  // DB에 변경이 있었을 때만 revalidate를 실행하여 불필요한 캐시 초기화를 방지
  if (hasChanges) {
    revalidatePath("/", "layout");
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
        const year = new Date(record.rentalDate * 1000).getFullYear();
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
      const participantRecordIds = db
        .selectDistinct({ recordId: rentalRecordPeople.rentalRecordId })
        .from(rentalRecordPeople)
        .where(like(rentalRecordPeople.name, `%${filters.username}%`));

      whereConditions.push(
        or(
          like(
            sql`COALESCE(${generalUsers.name}, ${rentalRecords.userName})`,
            `%${filters.username}%`
          ),
          inArray(rentalRecords.id, participantRecordIds)
        )
      );
    }
    if (filters.startDate) {
      const [year, month, day] = filters.startDate.split("-").map(Number);
      const startOfDay = new Date(year, month - 1, day);
      startOfDay.setHours(0, 0, 0, 0);
      whereConditions.push(
        gte(rentalRecords.rentalDate, Math.floor(startOfDay.getTime() / 1000))
      );
    }
    if (filters.endDate) {
      const [year, month, day] = filters.endDate.split("-").map(Number);
      const date = new Date(year, month - 1, day);
      date.setHours(23, 59, 59, 999);
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
    const startDate = new Date(yearNum, startMonth, 1);
    const endDate = new Date(startDate);
    if (month === "all") {
      endDate.setFullYear(yearNum + 1);
    } else {
      endDate.setMonth(startMonth + 1);
    }
    endDate.setDate(0);
    endDate.setHours(23, 59, 59, 999);

    const startTimestamp = Math.floor(startDate.getTime() / 1000);
    const endTimestamp = Math.floor(endDate.getTime() / 1000);

    whereConditions.push(gte(rentalRecords.rentalDate, startTimestamp));
    whereConditions.push(lte(rentalRecords.rentalDate, endTimestamp));

    if (category && category !== "all") {
      whereConditions.push(eq(items.category, category));
    }

    // [수정 1] 쿼리에서 '현재 아이템 정보'뿐만 아니라 '기록된(스냅샷) 아이템 정보'도 가져옵니다.
    const baseQuery = db
      .select({
        rentalDate: rentalRecords.rentalDate,
        userId: rentalRecords.userId,
        birthDate: generalUsers.birthDate,
        gender: generalUsers.gender,
        school: generalUsers.school,

        // 현재 아이템 테이블 정보 (Join)
        itemName: items.name,
        itemId: items.id,
        itemCategory: items.category,

        // 대여 기록 테이블에 저장된 정보 (스냅샷 - 아이템 삭제 대비)
        recordItemId: rentalRecords.itemsId,
        recordItemName: rentalRecords.itemName,
        recordItemCategory: rentalRecords.itemCategory,

        maleCount: rentalRecords.maleCount,
        femaleCount: rentalRecords.femaleCount,
        // peopleCount는 JS에서 계산 (SQL 계산 제거하여 null 안전성 확보)
      })
      .from(rentalRecords)
      .leftJoin(generalUsers, eq(rentalRecords.userId, generalUsers.id))
      .leftJoin(items, eq(rentalRecords.itemsId, items.id))
      .where(and(...whereConditions));

    let records = await baseQuery;

    records = records.map((r) => ({
      ...r,
      school: r.school ?? "기타",
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

    // [수정 2] 모든 통계 집계 시 Fallback 로직 적용 (itemId || recordItemId)
    const itemCounts = records.reduce((acc, r) => {
      // items 테이블에 없으면 rentalRecords에 저장된 ID 사용
      const id = r.itemId || r.recordItemId;
      const name = r.itemName || r.recordItemName;
      const category = r.itemCategory || r.recordItemCategory || "Unknown";

      if (id && typeof id === "number") {
        acc[id] = acc[id] || {
          id: id,
          name: name,
          category: category,
          rentals: 0,
        };
        acc[id].rentals++;
      }
      return acc;
    }, {} as Record<number, { id: number; name: string | null; category: string; rentals: number }>);

    const mostPopularItem =
      Object.values(itemCounts).sort((a, b) => b.rentals - a.rentals)[0] ||
      null;

    const categoryCounts = records.reduce((acc, r) => {
      // 카테고리도 Fallback 적용
      const category = r.itemCategory || r.recordItemCategory;
      if (category) {
        acc[category] = acc[category] || {
          name: category,
          rentals: 0,
        };
        acc[category].rentals++;
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
        const itemsInCategory = records.filter(
          (r) => (r.itemCategory || r.recordItemCategory) === name
        );
        const topItemsInCategory = Object.values(
          itemsInCategory.reduce((acc, r) => {
            const id = r.itemId || r.recordItemId;
            const name = r.itemName || r.recordItemName || "Unknown";

            if (id && typeof id === "number") {
              acc[id] = acc[id] || {
                itemId: id,
                itemName: name,
                rentals: 0,
              };
              acc[id].rentals++;
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

    const genderCounts = records.reduce(
      (acc, r) => {
        acc.male += r.maleCount || 0;
        acc.female += r.femaleCount || 0;
        return acc;
      },
      { male: 0, female: 0 }
    );

    const genderStats = [
      { name: "남성", value: genderCounts.male },
      { name: "여성", value: genderCounts.female },
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

    // --------------------------------------------------------------
    // [수정 3] 인원수별 통계 집계 (공란 문제 해결 핵심 로직)
    // --------------------------------------------------------------
    const peopleItemStats: {
      [key: number]: {
        [itemId: number]: { itemId: number; itemName: string; rentals: number };
      };
    } = {};

    records.forEach((r) => {
      // 1. 인원수 합산 (JS 계산)
      const p = (r.maleCount || 0) + (r.femaleCount || 0);

      // 2. 0명인 경우 집계 제외 (불필요한 0명 카드 생성 방지)
      if (p === 0) return;

      // 3. 아이템 ID/Name 결정 (스냅샷 사용으로 삭제된 아이템도 표시)
      const finalItemId = r.itemId || r.recordItemId;
      const finalItemName = r.itemName || r.recordItemName || "Unknown";

      // 4. 유효한 ID가 있을 때만 버킷 생성 및 집계
      if (finalItemId && typeof finalItemId === "number") {
        // 해당 인원수 그룹이 없을 때만 생성 (즉, 데이터가 확실히 있을 때만 그룹 생성)
        if (!peopleItemStats[p]) {
          peopleItemStats[p] = {};
        }

        if (!peopleItemStats[p][finalItemId]) {
          peopleItemStats[p][finalItemId] = {
            itemId: finalItemId,
            itemName: finalItemName,
            rentals: 0,
          };
        }
        peopleItemStats[p][finalItemId].rentals++;
      }
    });

    const peopleCountItemStats = Object.keys(peopleItemStats)
      .map((count) => {
        const peopleCount = Number(count);
        return {
          peopleCount: peopleCount,
          items: Object.values(peopleItemStats[peopleCount]).sort(
            (a, b) => b.rentals - a.rentals
          ),
        };
      })
      .sort((a, b) => a.peopleCount - b.peopleCount); // 1인, 2인 순서 정렬

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
      { header: "대여 날짜", key: "rentalDate", width: 25 },
      { header: "사용자 이름", key: "userName", width: 15 },
      { header: "아이템 이름", key: "itemName", width: 20 },
      { header: "아이템 카테고리", key: "itemCategory", width: 15 },
      { header: "남자 인원", key: "maleCount", width: 10 },
      { header: "여자 인원", key: "femaleCount", width: 10 },
    ];

    // 헤더 스타일 적용
    worksheet.getRow(1).eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFD3D3D3" }, // 회색
      };
      cell.font = {
        bold: true,
      };
      cell.alignment = {
        vertical: "middle",
        horizontal: "center",
      };
    });

    // 모든 데이터 셀에 가운데 정렬 적용
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 0) {
        // 헤더 행 제외
        row.eachCell((cell) => {
          cell.alignment = {
            vertical: "middle",
            horizontal: "center",
          };
        });
      }
    });

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
        and(eq(items.isTimeLimited, true), eq(rentalRecords.isReturned, false))
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
export async function checkUserRentalStatus(userId: number, itemId: number) {
  try {
    const item = await db.query.items.findFirst({
      where: eq(items.id, itemId),
      columns: { isTimeLimited: true },
    });

    if (!item) {
      return {
        isRenting: false,
        isWaiting: false,
        error: "아이템 정보를 찾을 수 없습니다.",
      };
    }

    if (item.isTimeLimited) {
      const currentRental = await db
        .select({ id: rentalRecords.id })
        .from(rentalRecords)
        .where(
          and(
            eq(rentalRecords.userId, userId),
            eq(rentalRecords.itemsId, itemId),
            eq(rentalRecords.isReturned, false)
          )
        )
        .get();

      if (currentRental) {
        return { isRenting: true, isWaiting: false, error: null };
      }
    }

    const waitingEntry = await db
      .select({ id: waitingQueue.id })
      .from(waitingQueue)
      .where(
        and(eq(waitingQueue.userId, userId), eq(waitingQueue.itemId, itemId))
      )
      .get();

    if (waitingEntry) {
      return { isRenting: false, isWaiting: true, error: null };
    }

    return { isRenting: false, isWaiting: false, error: null };
  } catch (error) {
    console.error("Error checking user rental status:", error);
    return {
      isRenting: false,
      isWaiting: false,
      error: "사용자 대여 상태 확인 중 오류가 발생했습니다.",
    };
  }
}
async function processNextInQueue(itemId: number) {
  const itemInfo = await db.query.items.findFirst({
    where: eq(items.id, itemId),
  });

  if (!itemInfo || !itemInfo.isTimeLimited) {
    // 시간제 아이템이 아니면 처리할 필요 없음
    return;
  }

  // 최대 시도 횟수 제한 (안전장치)
  let maxAttempts = 100;
  let attempts = 0;

  while (attempts < maxAttempts) {
    attempts++;

    const nextUserEntry = await db.query.waitingQueue.findFirst({
      where: eq(waitingQueue.itemId, itemId),
      orderBy: [asc(waitingQueue.requestDate)],
    });

    if (!nextUserEntry) {
      // 더 이상 대기자 없음
      break;
    }

    // 1. 횟수 제한 체크
    let isEligible = true;
    if (itemInfo.maxRentalsPerUser) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startOfDay = Math.floor(today.getTime() / 1000);
      const endOfDay = new Date();
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

      // SQLite count 결과를 명시적으로 Number로 변환
      if (Number(result?.value || 0) >= itemInfo.maxRentalsPerUser) {
        isEligible = false;
      }
    }

    if (isEligible) {
      // 2. 사용자 정보 조회
      const userToRent = await db.query.generalUsers.findFirst({
        where: eq(generalUsers.id, nextUserEntry.userId),
      });

      if (userToRent) {
        // 3. 자동 대여 처리
        const rentalDate = Math.floor(Date.now() / 1000);
        const returnDueDate =
          rentalDate + (itemInfo.rentalTimeMinutes || 0) * 60;

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
          maleCount: nextUserEntry.maleCount,
          femaleCount: nextUserEntry.femaleCount,
        });

        // 대기열에서 제거
        await db
          .delete(waitingQueue)
          .where(eq(waitingQueue.id, nextUserEntry.id));

        // 대여 완료, 더 이상 처리 불필요
        break;
      } else {
        // 사용자 정보가 없는 경우 (삭제된 사용자)
        // 대기열에서만 제거하고 다음 대기자 확인
        await db
          .delete(waitingQueue)
          .where(eq(waitingQueue.id, nextUserEntry.id));

        console.warn(
          `User ${nextUserEntry.userId} not found, removed from waiting queue`
        );
        // continue로 다음 대기자 시도
      }
    } else {
      // 횟수 초과자는 대기열에서 제거하고 다음 대기자 확인
      await db
        .delete(waitingQueue)
        .where(eq(waitingQueue.id, nextUserEntry.id));

      // continue로 다음 대기자 시도
    }
  }

  if (attempts >= maxAttempts) {
    console.error(
      `processNextInQueue exceeded max attempts for item ${itemId}`
    );
  }
}

export async function getRentalRecordPeople(rentalRecordId: number) {
  try {
    const people = await db
      .select()
      .from(rentalRecordPeople)
      .where(eq(rentalRecordPeople.rentalRecordId, rentalRecordId));
    return { success: true, data: people };
  } catch (error) {
    console.error("Error fetching rental record people:", error);
    return { success: false, error: "Failed to fetch rental record people." };
  }
}
