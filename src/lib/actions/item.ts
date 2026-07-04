"use server";

import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import { eq, and, count, desc, asc, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  items,
  itemAutoHideSchedules,
  rentalRecords,
  waitingQueue,
} from "@drizzle/schema";
import { itemSchema, updateItemSchema } from "@/lib/validators/item";
import { processAndMutateExpiredRentals } from "./rental";
import type { AutoHideSchedule } from "@/lib/item-availability";
import {
  getActiveAutoHideSchedule,
  normalizeAutoHideSchedules,
} from "@/lib/item-availability";

type ItemWithAutoHideSchedules<T> = T & {
  autoHideSchedules: AutoHideSchedule[];
};

async function dropLegacyAutoHideUniqueIndexes() {
  await db.run(sql`
    DROP INDEX IF EXISTS item_auto_hide_schedules_item_day_unique
  `);
  await db.run(sql`
    DROP INDEX IF EXISTS item_auto_hide_schedules_item_id_day_of_week_unique
  `);
  await db.run(sql`
    DROP INDEX IF EXISTS item_auto_hide_schedules_item_id_day_unique
  `);
}

function parseAutoHideSchedules(formData: FormData):
  | { schedules: AutoHideSchedule[]; error?: never }
  | { schedules?: never; error: string } {
  const rawSchedules = formData.get("autoHideSchedules");
  if (!rawSchedules) return { schedules: [] };

  try {
    const parsed = JSON.parse(String(rawSchedules));
    if (!Array.isArray(parsed)) {
      return { error: "자동 숨김 설정 형식이 올바르지 않습니다." };
    }

    const schedules = normalizeAutoHideSchedules(parsed);
    if (parsed.length !== schedules.length) {
      return { error: "자동 숨김 요일과 시간을 올바르게 설정해주세요." };
    }

    return { schedules };
  } catch (error) {
    return { error: "자동 숨김 설정을 읽을 수 없습니다." };
  }
}

async function attachAutoHideSchedules<T extends { id: number }>(
  itemList: T[]
): Promise<Array<ItemWithAutoHideSchedules<T>>> {
  if (itemList.length === 0) return [];

  const schedules = await db
    .select()
    .from(itemAutoHideSchedules)
    .where(
      inArray(
        itemAutoHideSchedules.itemId,
        itemList.map((item) => item.id)
      )
    )
    .orderBy(asc(itemAutoHideSchedules.dayOfWeek));

  const schedulesByItemId = new Map<number, AutoHideSchedule[]>();
  schedules.forEach((schedule) => {
    const itemSchedules = schedulesByItemId.get(schedule.itemId) ?? [];
    itemSchedules.push({
      dayOfWeek: schedule.dayOfWeek,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
    });
    schedulesByItemId.set(schedule.itemId, itemSchedules);
  });

  return itemList.map((item) => ({
    ...item,
    autoHideSchedules: schedulesByItemId.get(item.id) ?? [],
  }));
}

async function saveItemAutoHideSchedules(
  itemId: number,
  schedules: AutoHideSchedule[]
) {
  await dropLegacyAutoHideUniqueIndexes();

  await db
    .delete(itemAutoHideSchedules)
    .where(eq(itemAutoHideSchedules.itemId, itemId));

  if (schedules.length === 0) return;

  await db.insert(itemAutoHideSchedules).values(
    schedules.map((schedule) => ({
      itemId,
      dayOfWeek: schedule.dayOfWeek,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
    }))
  );
}

// ----------------------------------------------------------------------
// 조회 관련 액션
// ----------------------------------------------------------------------

export async function getAllItemsForAdmin() {
  const now = new Date();
  const allItems = await attachAutoHideSchedules(await db
    .select()
    .from(items)
    .orderBy(asc(items.displayOrder)));

  const itemsWithStatusAndWaitingCount = await Promise.all(
    allItems.map(async (item) => {
      let status: "RENTED" | "AVAILABLE" = "AVAILABLE";
      let returnDueDate: number | null = null;

      if (item.isTimeLimited) {
        const currentRental = await db.query.rentalRecords.findFirst({
          where: and(
            eq(rentalRecords.itemsId, item.id),
            eq(rentalRecords.isReturned, false)
          ),
          orderBy: [desc(rentalRecords.rentalDate)],
        });

        if (currentRental) {
          status = "RENTED";
          returnDueDate = currentRental.returnDueDate;
        }
      }

      const waitingCountResult = await db
        .select({ value: count() })
        .from(waitingQueue)
        .where(eq(waitingQueue.itemId, item.id));

      const waitingCount = waitingCountResult[0]?.value || 0;
      const activeAutoHideSchedule = getActiveAutoHideSchedule(item, now);

      return {
        ...item,
        status,
        waitingCount,
        returnDueDate,
        isAutoHidden: Boolean(activeAutoHideSchedule),
        activeAutoHideSchedule,
      };
    })
  );

  return itemsWithStatusAndWaitingCount;
}

export async function getAllItems() {
  await processAndMutateExpiredRentals();
  const now = new Date();
  const allItems =
    await attachAutoHideSchedules(
      await db
        .select()
        .from(items)
        .where(and(eq(items.isHidden, false), eq(items.isDeleted, false)))
        .orderBy(asc(items.displayOrder))
    );

  const itemsWithStatusAndWaitingCount = await Promise.all(
    allItems.map(async (item) => {
      let status: "RENTED" | "AVAILABLE" = "AVAILABLE";
      let returnDueDate: number | null = null;

      if (item.isTimeLimited) {
        const currentRental = await db.query.rentalRecords.findFirst({
          where: and(
            eq(rentalRecords.itemsId, item.id),
            eq(rentalRecords.isReturned, false)
          ),
          orderBy: [desc(rentalRecords.rentalDate)],
        });

        if (currentRental) {
          status = "RENTED";
          returnDueDate = currentRental.returnDueDate;
        }
      }

      const waitingCountResult = await db
        .select({ value: count() })
        .from(waitingQueue)
        .where(eq(waitingQueue.itemId, item.id));

      const waitingCount = waitingCountResult[0]?.value || 0;
      const activeAutoHideSchedule = getActiveAutoHideSchedule(item, now);

      return {
        ...item,
        status,
        waitingCount,
        returnDueDate,
        isAutoHidden: Boolean(activeAutoHideSchedule),
        activeAutoHideSchedule,
      };
    })
  );

  return itemsWithStatusAndWaitingCount.sort((first, second) => {
    if (first.isAutoHidden !== second.isAutoHidden) {
      return first.isAutoHidden ? 1 : -1;
    }

    return first.displayOrder - second.displayOrder;
  });
}

// ----------------------------------------------------------------------
// 생성/수정/삭제 액션
// ----------------------------------------------------------------------

export async function addItem(formData: FormData) {
  const name = formData.get("name") as string;
  const category = formData.get("category") as string;

  if (!name || !category) {
    return { error: "필수 필드를 모두 입력해주세요." };
  }

  const data = {
    name,
    category,
    isTimeLimited: formData.get("isTimeLimited") === "true",
    enableParticipantTracking:
      formData.get("enableParticipantTracking") === "true",
    isAutomaticGenderCount: formData.get("isAutomaticGenderCount") === "true", // 추가
    rentalTimeMinutes: formData.get("rentalTimeMinutes")
      ? parseInt(formData.get("rentalTimeMinutes") as string, 10)
      : undefined,
    maxRentalsPerUser: formData.get("maxRentalsPerUser")
      ? parseInt(formData.get("maxRentalsPerUser") as string, 10)
      : undefined,
    imageUrl: undefined as string | undefined,
  };

  const scheduleResult = parseAutoHideSchedules(formData);
  if (scheduleResult.error) return { error: scheduleResult.error };

  const imageFile = formData.get("image") as File | null;
  if (imageFile && imageFile.size > 0) {
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });

    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const safeName = imageFile.name
      .replace(/\s+/g, "_")
      .replace(/[^\w\.-]/g, "");
    const filename = `${uniqueSuffix}-${safeName}`;
    const filePath = path.join(uploadsDir, filename);

    try {
      const bytes = await imageFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(filePath, buffer);
      data.imageUrl = `/uploads/${filename}`;
    } catch (error) {
      return { error: "이미지 파일 저장에 실패했습니다." };
    }
  }

  const validatedResult = itemSchema.safeParse(data);
  if (!validatedResult.success) {
    return { error: "유효하지 않은 데이터입니다." };
  }

  try {
    const [newItem] = await db
      .insert(items)
      .values(validatedResult.data)
      .returning({ id: items.id });

    if (newItem) {
      await saveItemAutoHideSchedules(
        newItem.id,
        scheduleResult.schedules ?? []
      );
    }

    revalidatePath("/admin/items");
    revalidatePath("/kiosk");
    return { success: true };
  } catch (error) {
    return { error: "아이템 추가에 실패했습니다." };
  }
}

export async function updateItem(formData: FormData) {
  const id = parseInt(formData.get("id") as string);
  const name = formData.get("name") as string;
  const category = formData.get("category") as string;
  const imageFile = formData.get("image") as File;
  const imageUrlFromForm = formData.get("imageUrl") as string;
  const deleteImage = formData.get("deleteImage") === "true";
  const isTimeLimited = formData.get("isTimeLimited") === "true";
  const enableParticipantTracking =
    formData.get("enableParticipantTracking") === "true";
  const isAutomaticGenderCount =
    formData.get("isAutomaticGenderCount") === "true"; // 추가

  const rentalTimeMinutes = formData.get("rentalTimeMinutes")
    ? parseInt(formData.get("rentalTimeMinutes") as string)
    : undefined;
  const maxRentalsPerUser = formData.get("maxRentalsPerUser")
    ? parseInt(formData.get("maxRentalsPerUser") as string)
    : undefined;

  if (isNaN(id)) return { error: "유효하지 않은 ID입니다." };
  const scheduleResult = parseAutoHideSchedules(formData);
  if (scheduleResult.error) return { error: scheduleResult.error };

  const [existingItem] = await db.select().from(items).where(eq(items.id, id));
  if (!existingItem) return { error: "존재하지 않는 아이템입니다." };

  const deleteFileFromDisk = async (url: string) => {
    try {
      const filePath = path.join(process.cwd(), "public", url);
      await unlink(filePath);
    } catch (error) {}
  };

  let newImageUrl: string | undefined | null;

  if (imageFile && imageFile.size > 0) {
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    try {
      await mkdir(uploadsDir, { recursive: true });
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const safeName = imageFile.name
        .replace(/\s+/g, "_")
        .replace(/[^\w\.-]/g, "");
      const filename = `${uniqueSuffix}-${safeName}`;
      const filePath = path.join(uploadsDir, filename);
      const bytes = await imageFile.arrayBuffer();
      await writeFile(filePath, Buffer.from(bytes));
      newImageUrl = `/uploads/${filename}`;
    } catch (error) {
      return { error: "이미지 파일 저장에 실패했습니다." };
    }
  } else if (deleteImage) {
    newImageUrl = null;
  } else if (imageUrlFromForm) {
    newImageUrl = imageUrlFromForm;
  }

  const dataToUpdate: any = {
    name,
    category,
    isTimeLimited,
    enableParticipantTracking,
    isAutomaticGenderCount, // 추가
    rentalTimeMinutes,
    maxRentalsPerUser,
  };

  if (newImageUrl !== undefined) dataToUpdate.imageUrl = newImageUrl;

  const validatedData = updateItemSchema.safeParse({ id, ...dataToUpdate });
  if (!validatedData.success) return { error: "유효하지 않은 데이터입니다." };

  try {
    // 1. DB 업데이트
    const { id: _id, ...itemData } = validatedData.data;
    await db.update(items).set(itemData).where(eq(items.id, id));
    await saveItemAutoHideSchedules(id, scheduleResult.schedules ?? []);

    // 2. 파일 정리
    if (deleteImage && existingItem.imageUrl) {
      await deleteFileFromDisk(existingItem.imageUrl);
    } else if (
      newImageUrl &&
      newImageUrl !== existingItem.imageUrl &&
      existingItem.imageUrl
    ) {
      await deleteFileFromDisk(existingItem.imageUrl);
    }

    // 3. 🔥 설정 변경 감지: 시간제 대여가 활성에서 비활성으로 바뀔 때만 정리
    if (existingItem.isTimeLimited && !isTimeLimited) {
      // 대기열 삭제
      await db.delete(waitingQueue).where(eq(waitingQueue.itemId, id));
      // 현재 대여 중인 항목 강제 반납 처리
      await db
        .update(rentalRecords)
        .set({
          isReturned: true,
          returnDate: Date.now(),
          isManualReturn: true,
        })
        .where(
          and(
            eq(rentalRecords.itemsId, id),
            eq(rentalRecords.isReturned, false)
          )
        );
    }

    revalidatePath("/admin/items");
    revalidatePath("/kiosk");
    return { success: true };
  } catch (error) {
    console.error("Update item error:", error);
    return { error: "아이템 정보 업데이트에 실패했습니다." };
  }
}

export async function deleteItem(id: number) {
  try {
    await db.update(items).set({ isDeleted: true }).where(eq(items.id, id));
    revalidatePath("/admin/items");
    return { success: true };
  } catch (error) {
    return { error: "아이템 삭제에 실패했습니다." };
  }
}

export async function getDistinctCategories() {
  try {
    const categories = await db
      .selectDistinct({ category: items.category })
      .from(items);
    return { success: true, data: categories.map((c) => c.category) };
  } catch (error) {
    return { error: "카테고리를 불러오는 데 실패했습니다." };
  }
}

export async function getDistinctItemNames() {
  try {
    const itemNames = await db.selectDistinct({ name: items.name }).from(items);
    return { success: true, data: itemNames.map((c) => c.name) };
  } catch (error) {
    return { error: "아이템 이름을 불러오는 데 실패했습니다." };
  }
}

export async function toggleItemVisibility(id: number, isHidden: boolean) {
  try {
    await db.update(items).set({ isHidden }).where(eq(items.id, id));
    revalidatePath("/admin/items");
    revalidatePath("/kiosk"); // 키오스크 페이지도 업데이트
    return { success: true };
  } catch (error) {
    console.error("Failed to toggle item visibility:", error);
    return { error: "아이템 숨김 업데이트에 실패했습니다." };
  }
}

export async function toggleItemDeletedStatus(id: number, isDeleted: boolean) {
  try {
    await db.update(items).set({ isDeleted }).where(eq(items.id, id));
    revalidatePath("/admin/items");
    revalidatePath("/kiosk"); // 키오스크 페이지도 업데이트
    return { success: true };
  } catch (error) {
    console.error("Failed to toggle item deleted status:", error);
    return { error: "아이템 삭제 상태 업데이트에 실패했습니다." };
  }
}
export async function updateItemOrder(
  newOrder: { id: number; displayOrder: number }[]
) {
  try {
    for (const item of newOrder) {
      await db
        .update(items)
        .set({ displayOrder: item.displayOrder })
        .where(eq(items.id, item.id));
    }

    revalidatePath("/admin/items");
    revalidatePath("/kiosk"); // 키오스크 페이지도 업데이트
    return { success: true };
  } catch (error) {
    console.error("Failed to update item order:", error);
    return { error: "순서 변경에 실패했습니다." };
  }
}
