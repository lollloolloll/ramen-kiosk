"use server";

import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { items, rentalRecords, waitingQueue } from "@drizzle/schema";
import { itemSchema, updateItemSchema } from "@/lib/validators/item";

export async function getItems(includeDeleted = false) {
  if (includeDeleted) {
    const data = await db.select().from(items);
    return data;
  }
  const data = await db
    .select()
    .from(items)
    .where(and(eq(items.isHidden, false), eq(items.isDeleted, false)));
  return data;
}

export async function getAllItems() {
  const allItems = await db.select().from(items);

  const itemsWithStatusAndWaitingCount = await Promise.all(
    allItems.map(async (item) => {
      // Calculate status
      const rented = await db
        .select()
        .from(rentalRecords)
        .where(and(eq(rentalRecords.itemsId, item.id), eq(rentalRecords.isReturned, false)));

      const status: "RENTED" | "AVAILABLE" = rented.length > 0 ? "RENTED" : "AVAILABLE";

      // Calculate waitingCount
      const waitingCount = await db
        .select()
        .from(waitingQueue)
        .where(eq(waitingQueue.itemId, item.id));

      return {
        ...item,
        status,
        waitingCount: waitingCount.length,
      };
    })
  );

  return itemsWithStatusAndWaitingCount;
}

export async function addItem(formData: FormData) {
  const name = formData.get("name") as string;
  const category = formData.get("category") as string;
  const imageFile = formData.get("image") as File;
  const isTimeLimited = formData.get("isTimeLimited") === "true";
  const rentalTimeMinutes = formData.get("rentalTimeMinutes")
    ? parseInt(formData.get("rentalTimeMinutes") as string)
    : undefined;
  const maxRentalsPerUser = formData.get("maxRentalsPerUser")
    ? parseInt(formData.get("maxRentalsPerUser") as string)
    : undefined;

  if (!name || !category) return { error: "필수 필드를 모두 입력해주세요." };

  let imageUrl: string | undefined;

  if (imageFile && imageFile.size > 0) {
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });

    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const filename = `${uniqueSuffix}-${imageFile.name}`;
    const filePath = path.join(uploadsDir, filename);

    const bytes = await imageFile.arrayBuffer();
    const buffer = Buffer.from(bytes);

    try {
      await writeFile(filePath, buffer);
      imageUrl = `/uploads/${filename}`;
    } catch (error) {
      console.error("Failed to write image file:", error);
      return { error: "이미지 파일 저장에 실패했습니다." };
    }
  }

  const data = {
    name,
    category,
    imageUrl,
    isTimeLimited,
    rentalTimeMinutes,
    maxRentalsPerUser,
  };
  const validatedData = itemSchema.safeParse(data);
  if (!validatedData.success) {
    console.error("Validation error:", validatedData.error);
    return { error: "유효하지 않은 데이터입니다." };
  }

  try {
    await db.insert(items).values(validatedData.data); // <- 여기 insert
    revalidatePath("/admin/items"); // ISR 업데이트
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
    rentalTimeMinutes?: number;
    maxRentalsPerUser?: number;
  } = {};
  if (name) dataToUpdate.name = name;
  if (category) dataToUpdate.category = category;
  if (imageUrl) dataToUpdate.imageUrl = imageUrl;
  dataToUpdate.isTimeLimited = isTimeLimited;
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
