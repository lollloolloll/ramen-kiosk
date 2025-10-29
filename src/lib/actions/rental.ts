"use server";

import { db } from "@/lib/db";
import { rentalRecords, items, generalUsers } from "@drizzle/schema";
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
  peopleCount: number
) {
  try {
    // 1. 트랜잭션을 사용하지 않고 직접 db 객체를 사용합니다.
    // 먼저 대여할 아이템이 DB에 존재하는지 확인합니다.
    const itemToRent = await db
      .select({ id: items.id }) // 전체 데이터를 가져올 필요 없이 id만 확인해도 됩니다.
      .from(items)
      .where(eq(items.id, itemId))
      .get();

    if (!itemToRent) {
      throw new Error("해당 아이템을 찾을 수 없습니다.");
    }

    // 아이템이 존재하면 rentalRecords 테이블에 새 기록을 삽입합니다.
    await db.insert(rentalRecords).values({
      userId: userId,
      itemsId: itemId,
      // 2. rentalDate를 초 단위 UNIX 타임스탬프로 직접 설정합니다.
      // Date.now()는 밀리초이므로 1000으로 나눠 초 단위로 만듭니다.
      rentalDate: Math.floor(Date.now() / 1000),
      peopleCount: peopleCount,
    });

    revalidatePath("/");
    revalidatePath("/admin/items");
    revalidatePath("/admin/records");

    return { success: true };
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

export async function getAllItemNames() {
  try {
    const itemNames = await db
      .selectDistinct({ name: items.name })
      .from(items)
      .where(sql`${items.name} IS NOT NULL`); // Ensure only items with names are returned

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
        userName: generalUsers.name,
        itemName: items.name,
        itemCategory: items.category,
        peopleCount: rentalRecords.peopleCount,
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
        peopleCount: rentalRecords.peopleCount,
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
      peopleCount: rentalRecords.peopleCount,
    };
    const sortColumn =
      sortColumnMap[sort as keyof typeof sortColumnMap] ||
      rentalRecords.rentalDate;

    // ✅ Solution: Build the complete query in one chain instead of reassigning
    const dataQuery = db
      .select({
        id: rentalRecords.id,
        rentalDate: rentalRecords.rentalDate,
        userName: generalUsers.name,
        itemName: items.name,
        itemCategory: items.category,
        peopleCount: rentalRecords.peopleCount,
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
    // 1. 동적 WHERE 조건 생성
    const whereConditions = [];

    // 날짜 필터
    const yearNum = parseInt(year);
    const startMonth = month === "all" ? 0 : parseInt(month) - 1;
    const startDate = new Date(Date.UTC(yearNum, startMonth, 1));
    const endDate = new Date(startDate);
    if (month === "all") {
      endDate.setUTCFullYear(yearNum + 1);
    } else {
      endDate.setUTCMonth(startMonth + 1);
    }
    endDate.setUTCDate(0); // 해당 월의 마지막 날로 설정
    endDate.setUTCHours(23, 59, 59, 999);

    whereConditions.push(
      gte(rentalRecords.rentalDate, Math.floor(startDate.getTime() / 1000))
    );
    whereConditions.push(
      lte(rentalRecords.rentalDate, Math.floor(endDate.getTime() / 1000))
    );

    // 카테고리 필터
    if (category && category !== "all") {
      whereConditions.push(eq(items.category, category));
    }

    // 연령대 필터 (DB에서 직접 처리하기 복잡하므로 JS에서 필터링)
    // 하지만 먼저 DB에서 최대한 필터링된 데이터를 가져옵니다.
    const baseQuery = db
      .select({
        rentalDate: rentalRecords.rentalDate,
        userId: rentalRecords.userId,
        birthDate: generalUsers.birthDate,
        gender: generalUsers.gender,
        itemName: items.name,
        itemId: items.id,
        itemCategory: items.category,
      })
      .from(rentalRecords)
      .leftJoin(generalUsers, eq(rentalRecords.userId, generalUsers.id))
      .leftJoin(items, eq(rentalRecords.itemsId, items.id))
      .where(and(...whereConditions));

    let records = await baseQuery;

    // 연령대 필터가 있으면 JS에서 추가 필터링
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

    // 2. 데이터 분석 및 가공

    // KPIs
    const totalRentals = records.length;
    const uniqueUsers = new Set(records.map((r) => r.userId)).size;

    const itemCounts = records.reduce((acc, r) => {
      if (r.itemId) {
        acc[r.itemId] = acc[r.itemId] || {
          id: r.itemId,
          name: r.itemName,
          rentals: 0,
        };
        acc[r.itemId].rentals++;
      }
      return acc;
    }, {} as Record<number, { id: number; name: string | null; rentals: number }>);

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

    // Age Group Stats
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

    // Category Stats
    const categoryStats = Object.entries(categoryCounts)
      .map(([name, data]) => ({
        category: name,
        totalRentals: data.rentals,
      }))
      .sort((a, b) => b.totalRentals - a.totalRentals);

    // Item Stats
    const allItemCounts = Object.values(itemCounts).sort(
      (a, b) => b.rentals - a.rentals
    );
    const topItems = allItemCounts.slice(0, 10);
    const unpopularItems = allItemCounts
      .filter((item) => item.rentals <= 5)
      .reverse();

    // Time Pattern Stats
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

    // Gender Stats
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

    // 3. 최종 데이터 구조로 반환
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
    };
  } catch (error) {
    console.error("Error fetching rental analytics:", error);
    // 에러 발생 시 빈 데이터 구조 반환
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
      { header: "인원수", key: "peopleCount", width: 10 },
    ];

    // 데이터 추가
    data.forEach((record) => {
      worksheet.addRow({
        id: record.id,
        rentalDate: new Date(record.rentalDate * 1000).toLocaleString("ko-KR"), // UNIX 타임스탬프를 사람이 읽기 쉬운 형식으로 변환
        userName: record.userName,
        itemName: record.itemName,
        itemCategory: record.itemCategory,
        peopleCount: record.peopleCount,
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
