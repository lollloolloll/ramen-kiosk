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

export async function addToWaitingList(userId: number, itemId: number) {
  try {
    // 1. 아이템 및 사용자 정보 조회
    const [item, user] = await Promise.all([
      db.query.items.findFirst({ where: eq(items.id, itemId) }),
      db.query.generalUsers.findFirst({
        where: eq(generalUsers.id, userId),
      }),
    ]);

    if (!item || !user) {
      throw new Error("아이템 또는 사용자 정보를 찾을 수 없습니다.");
    }

    // 시간제 대여 아이템인지 확인
    if (!item.isTimeLimited) {
      throw new Error("이 아이템은 대기열을 지원하지 않습니다.");
    }

    // 2. 이미 대기열에 있는지 확인
    const existingWaiting = await db.query.waitingQueue.findFirst({
      where: and(
        eq(waitingQueue.userId, userId),
        eq(waitingQueue.itemId, itemId)
      ),
    });

    if (existingWaiting) {
      throw new Error("이미 해당 아이템의 대기열에 등록되어 있습니다.");
    }

    // 3. 대기열에 추가
    await db.insert(waitingQueue).values({
      userId,
      itemId,
      requestDate: Math.floor(Date.now() / 1000),
    });

    // 4. 현재 대기 순번 계산
    const waitingCountResult = await db
      .select({ value: count() })
      .from(waitingQueue)
      .where(eq(waitingQueue.itemId, itemId));

    const waitingPosition = waitingCountResult[0].value;

    revalidatePath("/(kiosk)/kiosk");
    revalidatePath("/admin/waitings");

    return {
      success: true,
      message: "대기열에 성공적으로 등록되었습니다.",
      waitingPosition,
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "대기열 등록 중 오류가 발생했습니다.",
    };
  }
}

export async function getWaitingQueueEntries(filters: {
  page?: number;
  per_page?: number;
}) {
  try {
    const { page = 1, per_page = 10 } = filters;
    const offset = (page - 1) * per_page;

    const whereConditions: any[] = [];

    const baseQuery = db
      .select({
        id: waitingQueue.id,
        itemId: waitingQueue.itemId,
        userId: waitingQueue.userId,
        requestDate: waitingQueue.requestDate,
        itemName: items.name,
        userName: generalUsers.name,
        rentalTimeMinutes: items.rentalTimeMinutes,
        maxRentalsPerUser: items.maxRentalsPerUser,
      })
      .from(waitingQueue)
      .leftJoin(items, eq(waitingQueue.itemId, items.id))
      .leftJoin(generalUsers, eq(waitingQueue.userId, generalUsers.id));

    const filteredQuery =
      whereConditions.length > 0
        ? baseQuery.where(and(...whereConditions))
        : baseQuery;

    const dataQuery = filteredQuery
      .limit(per_page)
      .offset(offset)
      .orderBy(asc(waitingQueue.requestDate)); // 오래된 순으로 정렬

    const countQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(waitingQueue)
      .leftJoin(items, eq(waitingQueue.itemId, items.id))
      .leftJoin(generalUsers, eq(waitingQueue.userId, generalUsers.id))
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

    const [data, total] = await Promise.all([dataQuery, countQuery]);

    const total_count = total[0]?.count || 0;

    return { success: true, data, total_count };
  } catch (error) {
    console.error("Error fetching waiting queue entries:", error);
    return { error: "대기열 항목을 불러오는 데 실패했습니다." };
  }
}
export async function grantWaitingEntry(entryId: number) {
  try {
    // 1. 대기열 항목 조회
    const entry = await db.query.waitingQueue.findFirst({
      where: eq(waitingQueue.id, entryId),
    });

    if (!entry) {
      throw new Error("대기열 항목을 찾을 수 없습니다.");
    }

    // 2. 대여할 아이템 및 사용자 정보 조회
    const [itemToRent, userToRent] = await Promise.all([
      db.query.items.findFirst({ where: eq(items.id, entry.itemId) }),
      db.query.generalUsers.findFirst({
        where: eq(generalUsers.id, entry.userId),
      }),
    ]);

    if (!itemToRent || !userToRent) {
      throw new Error("아이템 또는 사용자 정보를 찾을 수 없습니다.");
    }

    // 3. [방어 로직] 아이템이 현재 사용 중인지 확인
    const currentRental = await db.query.rentalRecords.findFirst({
      where: and(
        eq(rentalRecords.itemsId, entry.itemId),
        eq(rentalRecords.isReturned, false)
      ),
    });

    if (currentRental) {
      throw new Error(
        "해당 아이템은 이미 다른 사용자가 이용 중입니다. 먼저 반납 처리를 해주세요."
      );
    }

    // 4. [검증 로직] 사용자의 하루 최대 대여 횟수 확인
    if (itemToRent.isTimeLimited && itemToRent.maxRentalsPerUser) {
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
            eq(rentalRecords.userId, entry.userId),
            eq(rentalRecords.itemsId, entry.itemId),
            gte(rentalRecords.rentalDate, startOfDay),
            lte(rentalRecords.rentalDate, endOfDayTimestamp)
          )
        );

      if (result.value >= itemToRent.maxRentalsPerUser) {
        // 횟수 초과 시, 대기열에서는 삭제하되 대여는 시키지 않음
        await db.delete(waitingQueue).where(eq(waitingQueue.id, entryId));
        revalidatePath("/admin/waitings");
        throw new Error(
          `사용자(ID: ${entry.userId})가 하루 최대 대여 횟수를 초과하여 대여할 수 없습니다. 대기열에서 삭제되었습니다.`
        );
      }
    }

    // 5. 대여 기록 생성
    const rentalDate = Math.floor(Date.now() / 1000);
    let returnDueDate: number | undefined = undefined;

    if (itemToRent.isTimeLimited && itemToRent.rentalTimeMinutes) {
      returnDueDate = rentalDate + itemToRent.rentalTimeMinutes * 60;
    }

    await db.insert(rentalRecords).values({
      userId: entry.userId,
      itemsId: entry.itemId,
      rentalDate: rentalDate,
      maleCount: 0, // 수동 승인 시 인원수는 기본값으로 설정
      femaleCount: 0,
      userName: userToRent.name,
      userPhone: userToRent.phoneNumber,
      itemName: itemToRent.name,
      itemCategory: itemToRent.category,
      returnDueDate: returnDueDate,
      isReturned: false,
    });

    // 6. 처리된 대기열 항목 삭제
    await db.delete(waitingQueue).where(eq(waitingQueue.id, entryId));

    revalidatePath("/admin/waitings");
    revalidatePath("/admin/records");
    revalidatePath("/admin/items");

    return {
      success: true,
      message: "대기열 항목이 성공적으로 승인되었습니다.",
    };
  } catch (error) {
    console.error("Error granting waiting entry:", error);
    return {
      error:
        error instanceof Error
          ? error.message
          : "대기열 항목 승인 중 오류가 발생했습니다.",
    };
  }
}

export async function cancelWaitingEntry(entryId: number) {
  try {
    const entry = await db
      .select({ id: waitingQueue.id })
      .from(waitingQueue)
      .where(eq(waitingQueue.id, entryId))
      .get();

    if (!entry) {
      throw new Error("대기열 항목을 찾을 수 없습니다.");
    }

    await db.delete(waitingQueue).where(eq(waitingQueue.id, entryId));

    revalidatePath("/admin/waitings");

    return {
      success: true,
      message: "대기열 항목이 성공적으로 취소되었습니다.",
    };
  } catch (error) {
    console.error("Error cancelling waiting entry:", error);
    return {
      error:
        error instanceof Error
          ? error.message
          : "대기열 항목 취소 중 오류가 발생했습니다.",
    };
  }
}

export async function getWaitingListByItemId(itemId: number) {
  try {
    const waitingList = await db
      .select({
        id: waitingQueue.id,
        userId: waitingQueue.userId,
        requestDate: waitingQueue.requestDate,
        userName: generalUsers.name,
        userPhone: generalUsers.phoneNumber,
      })
      .from(waitingQueue)
      .leftJoin(generalUsers, eq(waitingQueue.userId, generalUsers.id))
      .where(eq(waitingQueue.itemId, itemId))
      .orderBy(asc(waitingQueue.requestDate));

    return {
      success: true,
      data: waitingList.map((entry, index) => ({
        ...entry,
        position: index + 1,
      })),
    };
  } catch (error) {
    console.error("Error fetching waiting list by item id:", error);
    return {
      error:
        error instanceof Error
          ? error.message
          : "대기자 명단을 불러오는 데 실패했습니다.",
    };
  }
}
