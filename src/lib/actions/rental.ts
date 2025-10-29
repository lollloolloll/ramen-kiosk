"use server";

import { db } from "@/lib/db";
import { rentalRecords, items, generalUsers } from "@drizzle/schema";
import { eq, and, gte, lte, sql, asc, desc, like, count, countDistinct } from "drizzle-orm";
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

export async function getRentalRecordsWithUserDetails() {
  try {
    const records = await db
      .select({
        id: rentalRecords.id,
        rentalDate: rentalRecords.rentalDate,
        userId: generalUsers.id,
        userName: generalUsers.name,
        userGender: generalUsers.gender,
        userBirthDate: generalUsers.birthDate,
        itemName: items.name,
      })
      .from(rentalRecords)
      .leftJoin(generalUsers, eq(rentalRecords.userId, generalUsers.id))
      .leftJoin(items, eq(rentalRecords.itemsId, items.id));

    const data = records.map((record) => ({
      ...record,
      userAge: calculateAge(record.userBirthDate),
    }));

    return { success: true, data };
  } catch (error) {
    return { error: "상세 대여 기록을 불러오는 데 실패했습니다." };
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

const getAgeGroup = (birthDate: string) => {
  const age = calculateAge(birthDate);
  if (age === null) return null;
  if (age <= 12) return 'child';
  if (age <= 18) return 'teen';
  return 'adult';
};

async function getAgeGroupStats(
  filters: { year: string; month: string | 'all'; ageGroup?: string; category?: string }
) {
  const { year, month } = filters;

  const startDate = new Date(Date.UTC(parseInt(year), month === 'all' ? 0 : parseInt(month) - 1, 1));
  const endDate = new Date(startDate);
  if (month === 'all') {
    endDate.setUTCFullYear(startDate.getUTCFullYear() + 1);
    endDate.setUTCDate(endDate.getUTCDate() - 1);
  } else {
    endDate.setUTCMonth(startDate.getUTCMonth() + 1);
    endDate.setUTCDate(endDate.getUTCDate() - 1);
  }
  
  const records = await db
    .select({
      birthDate: generalUsers.birthDate,
      userId: rentalRecords.userId,
    })
    .from(rentalRecords)
    .leftJoin(generalUsers, eq(rentalRecords.userId, generalUsers.id))
    .where(
      and(
        gte(rentalRecords.rentalDate, Math.floor(startDate.getTime() / 1000)),
        lte(rentalRecords.rentalDate, Math.floor(endDate.getTime() / 1000))
      )
    );

  const ageGroups = {
    child: { count: 0, uniqueUsers: new Set<number>() },
    teen: { count: 0, uniqueUsers: new Set<number>() },
    adult: { count: 0, uniqueUsers: new Set<number>() },
  };

  records.forEach(record => {
    if (record.birthDate) {
      const age = calculateAge(record.birthDate);
      if (age !== null) {
        if (age <= 12) {
          ageGroups.child.count++;
          if(record.userId) ageGroups.child.uniqueUsers.add(record.userId);
        } else if (age <= 18) {
          ageGroups.teen.count++;
          if(record.userId) ageGroups.teen.uniqueUsers.add(record.userId);
        } else {
          ageGroups.adult.count++;
          if(record.userId) ageGroups.adult.uniqueUsers.add(record.userId);
        }
      }
    }
  });

  const totalRentals = records.length;

  return {
    child: {
      count: ageGroups.child.count,
      uniqueUsers: ageGroups.child.uniqueUsers.size,
      percentage: totalRentals > 0 ? (ageGroups.child.count / totalRentals) * 100 : 0,
    },
    teen: {
      count: ageGroups.teen.count,
      uniqueUsers: ageGroups.teen.uniqueUsers.size,
      percentage: totalRentals > 0 ? (ageGroups.teen.count / totalRentals) * 100 : 0,
    },
    adult: {
      count: ageGroups.adult.count,
      uniqueUsers: ageGroups.adult.uniqueUsers.size,
      percentage: totalRentals > 0 ? (ageGroups.adult.count / totalRentals) * 100 : 0,
    },
  };
}

async function getCategoryStats(
  filters: { year: string; month: string | 'all'; category?: string; ageGroup?: string }
) {
  const { year, month, category, ageGroup } = filters;

  const startDate = new Date(Date.UTC(parseInt(year), month === 'all' ? 0 : parseInt(month) - 1, 1));
  const endDate = new Date(startDate);
  if (month === 'all') {
    endDate.setUTCFullYear(startDate.getUTCFullYear() + 1);
    endDate.setUTCDate(endDate.getUTCDate() - 1);
  } else {
    endDate.setUTCMonth(startDate.getUTCMonth() + 1);
    endDate.setUTCDate(endDate.getUTCDate() - 1);
  }

  let query = db
    .select({
      category: items.category,
      itemId: items.id,
      itemName: items.name,
      birthDate: generalUsers.birthDate,
    })
    .from(rentalRecords)
    .leftJoin(items, eq(rentalRecords.itemsId, items.id))
    .leftJoin(generalUsers, eq(rentalRecords.userId, generalUsers.id))
    .where(
      and(
        gte(rentalRecords.rentalDate, Math.floor(startDate.getTime() / 1000)),
        lte(rentalRecords.rentalDate, Math.floor(endDate.getTime() / 1000))
      )
    );

  if (category) {
    // This is tricky with the current query structure. Let's adjust.
  }

  const records = await query;
  
  let filteredRecords = records;
  if (ageGroup) {
    filteredRecords = records.filter(r => {
      if (!r.birthDate) return false;
      const userAge = calculateAge(r.birthDate);
      if (userAge === null) return false;
      const group = userAge <= 12 ? 'child' : userAge <= 18 ? 'teen' : 'adult';
      return group === ageGroup;
    });
  }
  
  if (category) {
      filteredRecords = filteredRecords.filter(r => r.category === category);
  }


  const categoryMap = new Map<string, { totalRentals: number; items: Map<number, { name: string; rentals: number }> }>();

  filteredRecords.forEach(record => {
    if (record.category) {
      if (!categoryMap.has(record.category)) {
        categoryMap.set(record.category, { totalRentals: 0, items: new Map() });
      }
      const catData = categoryMap.get(record.category)!;
      catData.totalRentals++;
      if (record.itemId && record.itemName) {
        if (!catData.items.has(record.itemId)) {
          catData.items.set(record.itemId, { name: record.itemName, rentals: 0 });
        }
        catData.items.get(record.itemId)!.rentals++;
      }
    }
  });

  const totalRentals = filteredRecords.length;
  const result = Array.from(categoryMap.entries()).map(([category, data]) => {
    const topItems = Array.from(data.items.entries())
      .sort((a, b) => b[1].rentals - a[1].rentals)
      .slice(0, 3)
      .map(([itemId, itemData]) => ({
        itemId,
        itemName: itemData.name,
        rentals: itemData.rentals,
      }));

    return {
      category,
      totalRentals: data.totalRentals,
      percentage: totalRentals > 0 ? (data.totalRentals / totalRentals) * 100 : 0,
      topItems,
    };
  });

  return result.sort((a, b) => b.totalRentals - a.totalRentals);
}

async function getOverallKPIs(
  filters: { year: string; month: string | 'all'; ageGroup?: string; category?: string }
) {
    const { year, month, category, ageGroup } = filters;

  const startDate = new Date(Date.UTC(parseInt(year), month === 'all' ? 0 : parseInt(month) - 1, 1));
  const endDate = new Date(startDate);
  if (month === 'all') {
    endDate.setUTCFullYear(startDate.getUTCFullYear() + 1);
    endDate.setUTCDate(endDate.getUTCDate() - 1);
  } else {
    endDate.setUTCMonth(startDate.getUTCMonth() + 1);
    endDate.setUTCDate(endDate.getUTCDate() - 1);
  }

  const dateFilter = and(
    gte(rentalRecords.rentalDate, Math.floor(startDate.getTime() / 1000)),
    lte(rentalRecords.rentalDate, Math.floor(endDate.getTime() / 1000))
  );

  // This is not ideal, but we'll filter in JS for ageGroup
  const records = await db.select().from(rentalRecords).leftJoin(items, eq(rentalRecords.itemsId, items.id)).leftJoin(generalUsers, eq(rentalRecords.userId, generalUsers.id)).where(dateFilter);

  let filteredRecords = records;
  if (ageGroup) {
      filteredRecords = records.filter(r => {
          if (!r.general_users?.birthDate) return false;
          const userAge = calculateAge(r.general_users.birthDate);
          if (userAge === null) return false;
          const group = userAge <= 12 ? 'child' : userAge <= 18 ? 'teen' : 'adult';
          return group === ageGroup;
      });
  }
  if (category) {
      filteredRecords = filteredRecords.filter(r => r.items?.category === category);
  }

  const totalRentals = filteredRecords.length;
  const uniqueUsers = new Set(filteredRecords.map(r => r.rental_records.userId)).size;

  const itemRentals = new Map<number, { id: number, name: string, rentals: number }>();
  filteredRecords.forEach(r => {
      if (r.items) {
          if (!itemRentals.has(r.items.id)) {
              itemRentals.set(r.items.id, { id: r.items.id, name: r.items.name, rentals: 0 });
          }
          itemRentals.get(r.items.id)!.rentals++;
      }
  });
  const mostPopularItem = Array.from(itemRentals.values()).sort((a, b) => b.rentals - a.rentals)[0] || null;

  const categoryRentals = new Map<string, { name: string, rentals: number }>();
    filteredRecords.forEach(r => {
        if (r.items?.category) {
            if (!categoryRentals.has(r.items.category)) {
                categoryRentals.set(r.items.category, { name: r.items.category, rentals: 0 });
            }
            categoryRentals.get(r.items.category)!.rentals++;
        }
    });
    const mostPopularCategory = Array.from(categoryRentals.values()).sort((a, b) => b.rentals - a.rentals)[0] || null;


  return {
    totalRentals,
    uniqueUsers,
    mostPopularItem,
    mostPopularCategory,
  };
}

async function getItemStats(
  filters: { year: string; month: string | 'all'; ageGroup?: string; category?: string }
) {
  const { year, month, category, ageGroup } = filters;

  const startDate = new Date(Date.UTC(parseInt(year), month === 'all' ? 0 : parseInt(month) - 1, 1));
  const endDate = new Date(startDate);
  if (month === 'all') {
    endDate.setUTCFullYear(startDate.getUTCFullYear() + 1);
    endDate.setUTCDate(endDate.getUTCDate() - 1);
  } else {
    endDate.setUTCMonth(startDate.getUTCMonth() + 1);
    endDate.setUTCDate(endDate.getUTCDate() - 1);
  }

  const dateFilter = and(
    gte(rentalRecords.rentalDate, Math.floor(startDate.getTime() / 1000)),
    lte(rentalRecords.rentalDate, Math.floor(endDate.getTime() / 1000))
  );

  const records = await db.select().from(rentalRecords).leftJoin(items, eq(rentalRecords.itemsId, items.id)).leftJoin(generalUsers, eq(rentalRecords.userId, generalUsers.id)).where(dateFilter);
  
  let filteredRecords = records;
    if (ageGroup) {
        filteredRecords = records.filter(r => {
            if (!r.general_users?.birthDate) return false;
            const userAge = calculateAge(r.general_users.birthDate);
            if (userAge === null) return false;
            const group = userAge <= 12 ? 'child' : userAge <= 18 ? 'teen' : 'adult';
            return group === ageGroup;
        });
    }
    if (category) {
        filteredRecords = filteredRecords.filter(r => r.items?.category === category);
    }

  const itemRentals = new Map<number, { id: number, name: string, category: string, rentals: number }>();
  filteredRecords.forEach(r => {
    if (r.items) {
      if (!itemRentals.has(r.items.id)) {
        itemRentals.set(r.items.id, { id: r.items.id, name: r.items.name, category: r.items.category, rentals: 0 });
      }
      itemRentals.get(r.items.id)!.rentals++;
    }
  });

  const allItems = await db.select().from(items);
  allItems.forEach(item => {
      if (!itemRentals.has(item.id)) {
          itemRentals.set(item.id, { id: item.id, name: item.name, category: item.category, rentals: 0 });
      }
  });

  const sortedItems = Array.from(itemRentals.values()).sort((a, b) => b.rentals - a.rentals);
  
  const topItems = sortedItems.slice(0, 10);
  const unpopularItems = sortedItems.filter(item => item.rentals <= 5).reverse();

  return {
    topItems,
    unpopularItems,
  };
}

async function getTimePatternStats(
  filters: { year: string; month: string | 'all'; ageGroup?: string; category?: string }
) {
    const { year, month, category, ageGroup } = filters;

  const startDate = new Date(Date.UTC(parseInt(year), month === 'all' ? 0 : parseInt(month) - 1, 1));
  const endDate = new Date(startDate);
  if (month === 'all') {
    endDate.setUTCFullYear(startDate.getUTCFullYear() + 1);
    endDate.setUTCDate(endDate.getUTCDate() - 1);
  } else {
    endDate.setUTCMonth(startDate.getUTCMonth() + 1);
    endDate.setUTCDate(endDate.getUTCDate() - 1);
  }

  const dateFilter = and(
    gte(rentalRecords.rentalDate, Math.floor(startDate.getTime() / 1000)),
    lte(rentalRecords.rentalDate, Math.floor(endDate.getTime() / 1000))
  );

  const records = await db.select().from(rentalRecords).leftJoin(items, eq(rentalRecords.itemsId, items.id)).leftJoin(generalUsers, eq(rentalRecords.userId, generalUsers.id)).where(dateFilter);

  let filteredRecords = records;
    if (ageGroup) {
        filteredRecords = records.filter(r => {
            if (!r.general_users?.birthDate) return false;
            const userAge = calculateAge(r.general_users.birthDate);
            if (userAge === null) return false;
            const group = userAge <= 12 ? 'child' : userAge <= 18 ? 'teen' : 'adult';
            return group === ageGroup;
        });
    }
    if (category) {
        filteredRecords = filteredRecords.filter(r => r.items?.category === category);
    }

  const byHour = new Array(24).fill(0).map((_, i) => ({ hour: i, rentals: 0 }));
  const byDayOfWeek = [
      { day: 'Sun', rentals: 0 }, { day: 'Mon', rentals: 0 }, { day: 'Tue', rentals: 0 },
      { day: 'Wed', rentals: 0 }, { day: 'Thu', rentals: 0 }, { day: 'Fri', rentals: 0 },
      { day: 'Sat', rentals: 0 }
  ];

  filteredRecords.forEach(r => {
    const date = new Date(r.rental_records.rentalDate * 1000);
    byHour[date.getUTCHours()].rentals++;
    byDayOfWeek[date.getUTCDay()].rentals++;
  });

  return {
    byHour,
    byDayOfWeek,
  };
}

async function getGenderStats(
  filters: { year: string; month: string | 'all'; ageGroup?: string; category?: string }
) {
  const { year, month, category, ageGroup } = filters;

  const startDate = new Date(Date.UTC(parseInt(year), month === 'all' ? 0 : parseInt(month) - 1, 1));
  const endDate = new Date(startDate);
  if (month === 'all') {
    endDate.setUTCFullYear(startDate.getUTCFullYear() + 1);
    endDate.setUTCDate(endDate.getUTCDate() - 1);
  } else {
    endDate.setUTCMonth(startDate.getUTCMonth() + 1);
    endDate.setUTCDate(endDate.getUTCDate() - 1);
  }

  const dateFilter = and(
    gte(rentalRecords.rentalDate, Math.floor(startDate.getTime() / 1000)),
    lte(rentalRecords.rentalDate, Math.floor(endDate.getTime() / 1000))
  );

  const records = await db.select().from(rentalRecords).leftJoin(items, eq(rentalRecords.itemsId, items.id)).leftJoin(generalUsers, eq(rentalRecords.userId, generalUsers.id)).where(dateFilter);

  let filteredRecords = records;
  if (ageGroup) {
      filteredRecords = records.filter(r => {
          if (!r.general_users?.birthDate) return false;
          const userAge = calculateAge(r.general_users.birthDate);
          if (userAge === null) return false;
          const group = userAge <= 12 ? 'child' : userAge <= 18 ? 'teen' : 'adult';
          return group === ageGroup;
      });
  }
  if (category) {
      filteredRecords = filteredRecords.filter(r => r.items?.category === category);
  }

  const genderCounts = {
    male: 0,
    female: 0,
    other: 0,
  };

  filteredRecords.forEach(r => {
    if (r.general_users?.gender) {
      const gender = r.general_users.gender.toLowerCase();
      if (gender === 'male') {
        genderCounts.male++;
      } else if (gender === 'female') {
        genderCounts.female++;
      } else {
        genderCounts.other++;
      }
    }
  });

  return [
    { name: '남성', value: genderCounts.male },
    { name: '여성', value: genderCounts.female },
    { name: '기타', value: genderCounts.other },
  ];
}


export async function getRentalAnalytics(filters: {
  year: string;
  month: string | "all";
  ageGroup?: string;
  category?: string;
}): Promise<AnalyticsData> {
  try {
    const [
      ageGroupStats,
      categoryStats,
      kpis,
      itemStats,
      timePatternStats,
      genderStats,
    ] = await Promise.all([
      getAgeGroupStats(filters),
      getCategoryStats(filters),
      getOverallKPIs(filters),
      getItemStats(filters),
      getTimePatternStats(filters),
      getGenderStats(filters),
    ]);

    return {
      ageGroupStats,
      categoryStats,
      kpis,
      itemStats,
      timePatternStats,
      dayOfWeekStats: timePatternStats.byDayOfWeek.map(d => ({ name: d.day, count: d.rentals })),
      hourStats: timePatternStats.byHour.map(h => ({ name: h.hour.toString(), count: h.rentals })),
      genderStats,
    };
  } catch (error) {
    console.error("Error fetching rental analytics:", error);
    // Return a default structure in case of an error
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
      itemStats: {
        topItems: [],
        unpopularItems: [],
      },
      timePatternStats: {
        byHour: [],
        byDayOfWeek: [],
      },
      dayOfWeekStats: [],
      hourStats: [],
      genderStats: [],
    };
  }
}
