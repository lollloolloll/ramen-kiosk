"use server";

import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { eq, and, count, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { items, rentalRecords, waitingQueue } from "@drizzle/schema";
import { itemSchema, updateItemSchema } from "@/lib/validators/item";
import { processAndMutateExpiredRentals } from "./rental";
export async function getAllItemsForAdmin() {
  const allItems = await db.select().from(items);

  const itemsWithStatusAndWaitingCount = await Promise.all(
    allItems.map(async (item) => {
      let status: "RENTED" | "AVAILABLE";
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
        } else {
          status = "AVAILABLE";
        }
      } else {
        status = "AVAILABLE";
      }

      const waitingCountResult = await db
        .select({ value: count() })
        .from(waitingQueue)
        .where(eq(waitingQueue.itemId, item.id));

      const waitingCount = waitingCountResult[0]?.value || 0;

      return {
        ...item,
        status,
        waitingCount,
        returnDueDate,
      };
    })
  );

  return itemsWithStatusAndWaitingCount;
}

export async function getAllItems() {
  await processAndMutateExpiredRentals();
  const allItems = await db
    .select()
    .from(items)
    .where(and(eq(items.isHidden, false), eq(items.isDeleted, false)));

  const itemsWithStatusAndWaitingCount = await Promise.all(
    allItems.map(async (item) => {
      let status: "RENTED" | "AVAILABLE";
      let returnDueDate: number | null = null; // ADDED: 반납 예정 시간 저장 변수

      if (item.isTimeLimited) {
        // CHANGED: isReturned가 false인 가장 최근 기록을 조회합니다.
        // id 뿐만 아니라 returnDueDate도 가져옵니다.
        const currentRental = await db.query.rentalRecords.findFirst({
          where: and(
            eq(rentalRecords.itemsId, item.id),
            eq(rentalRecords.isReturned, false)
          ),
          orderBy: [desc(rentalRecords.rentalDate)], // 가장 최근 대여 기록 확인
        });

        if (currentRental) {
          status = "RENTED";
          returnDueDate = currentRental.returnDueDate; // ADDED: 조회된 반납 예정 시간을 할당합니다.
        } else {
          status = "AVAILABLE";
        }
      } else {
        status = "AVAILABLE";
      }

      // OPTIMIZED: 대기자 수를 더 효율적으로 계산합니다.
      const waitingCountResult = await db
        .select({ value: count() })
        .from(waitingQueue)
        .where(eq(waitingQueue.itemId, item.id));

      const waitingCount = waitingCountResult[0]?.value || 0;

      return {
        ...item,
        status,
        waitingCount, // 계산된 대기자 수
        returnDueDate, // ADDED: 최종 반환 객체에 returnDueDate를 포함합니다.
      };
    })
  );

  return itemsWithStatusAndWaitingCount;
}

export async function addItem(formData: FormData) {
  // 1. 기본 필드 추출 및 검증
  const name = formData.get("name") as string;
  const category = formData.get("category") as string;

  if (!name || !category) {
    return { error: "필수 필드를 모두 입력해주세요." };
  }

  // 2. FormData를 객체로 변환
  const data = {
    name,
    category,
    isTimeLimited: formData.get("isTimeLimited") === "true",
    enableParticipantTracking:
      formData.get("enableParticipantTracking") === "true",
    rentalTimeMinutes: formData.get("rentalTimeMinutes")
      ? parseInt(formData.get("rentalTimeMinutes") as string, 10)
      : undefined,
    maxRentalsPerUser: formData.get("maxRentalsPerUser")
      ? parseInt(formData.get("maxRentalsPerUser") as string, 10)
      : undefined,
    imageUrl: undefined as string | undefined,
  };

  // 3. 이미지 처리
  const imageFile = formData.get("image") as File | null;
  if (imageFile && imageFile.size > 0) {
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });

    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    // 안전한 파일명 처리 (공백 외에 다른 특수문자도 처리)
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
      console.error("Failed to write image file:", error);
      return { error: "이미지 파일 저장에 실패했습니다." };
    }
  }

  // 4. Zod 유효성 검사
  const validatedResult = itemSchema.safeParse(data);
  if (!validatedResult.success) {
    console.error("Validation error:", validatedResult.error.flatten());
    return { error: "유효하지 않은 데이터입니다." };
  }

  // 5. DB 삽입
  try {
    await db.insert(items).values(validatedResult.data);
    revalidatePath("/admin/items");
    return { success: true };
  } catch (error) {
    console.error("Failed to add item:", error);
    return { error: "아이템 추가에 실패했습니다." };
  }
}
export async function updateItem(formData: FormData) {
  const id = parseInt(formData.get("id") as string);
  const name = formData.get("name") as string;
  const category = formData.get("category") as string;
  const imageFile = formData.get("image") as File;
  const imageUrlFromForm = formData.get("imageUrl") as string;
  const isTimeLimited = formData.get("isTimeLimited") === "true";
  const enableParticipantTracking =
    formData.get("enableParticipantTracking") === "true"; // 추가
  const rentalTimeMinutes = formData.get("rentalTimeMinutes")
    ? parseInt(formData.get("rentalTimeMinutes") as string)
    : undefined;
  const maxRentalsPerUser = formData.get("maxRentalsPerUser")
    ? parseInt(formData.get("maxRentalsPerUser") as string)
    : undefined;

  if (isNaN(id)) {
    return { error: "유효하지 않은 ID입니다." };
  }

  let imageUrl: string | undefined;

  if (imageFile && imageFile.size > 0) {
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    try {
      await mkdir(uploadsDir, { recursive: true });
    } catch (error) {
      return { error: "이미지 업로드 디렉토리 생성에 실패했습니다." };
    }

    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const filename = `${uniqueSuffix}-${imageFile.name}`;
    const filePath = path.join(uploadsDir, filename);
    const bytes = await imageFile.arrayBuffer();
    const buffer = Buffer.from(bytes);

    try {
      await writeFile(filePath, buffer);
      imageUrl = `/uploads/${filename}`;
    } catch (error) {
      return { error: "이미지 파일 저장에 실패했습니다." };
    }
  } else if (imageUrlFromForm) {
    imageUrl = imageUrlFromForm;
  }

  const dataToUpdate: {
    name?: string;
    category?: string;
    imageUrl?: string;
    isTimeLimited?: boolean;
    enableParticipantTracking?: boolean; // 추가
    rentalTimeMinutes?: number;
    maxRentalsPerUser?: number;
  } = {};
  if (name) dataToUpdate.name = name;
  if (category) dataToUpdate.category = category;
  if (imageUrl) dataToUpdate.imageUrl = imageUrl;
  dataToUpdate.isTimeLimited = isTimeLimited;
  dataToUpdate.enableParticipantTracking = enableParticipantTracking; // 추가
  if (rentalTimeMinutes) dataToUpdate.rentalTimeMinutes = rentalTimeMinutes;
  if (maxRentalsPerUser) dataToUpdate.maxRentalsPerUser = maxRentalsPerUser;

  const validatedData = updateItemSchema.safeParse({ id, ...dataToUpdate });
  if (!validatedData.success) {
    return { error: "유효하지 않은 데이터입니다." };
  }

  try {
    await db.update(items).set(validatedData.data).where(eq(items.id, id));
    revalidatePath("/admin/items");
    return { success: true };
  } catch (error) {
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
    return { success: true };
  } catch (error) {
    console.error("Failed to toggle item deleted status:", error);
    return { error: "아이템 삭제 상태 업데이트에 실패했습니다." };
  }
}
