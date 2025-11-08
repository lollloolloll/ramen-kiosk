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
  maleCount: number,
  femaleCount: number
) {
  try {
    // 1. 대여할 아이템 정보 조회
    const itemToRent = await db
      .select({
        id: items.id,
        name: items.name,
        category: items.category,
      })
      .from(items)
      .where(eq(items.id, itemId))
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

    // 3. rentalRecords 테이블에 새 기록 삽입 (사용자 및 아이템 정보 포함)
    await db.insert(rentalRecords).values({
      userId: userId,
      itemsId: itemId,
      rentalDate: Math.floor(Date.now() / 1000),
      maleCount: maleCount,
      femaleCount: femaleCount,
      // 사용자 및 아이템 정보 스냅샷 저장
      userName: userToRent.name,
      userPhone: userToRent.phoneNumber,
      itemName: itemToRent.name,
      itemCategory: itemToRent.category,
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
