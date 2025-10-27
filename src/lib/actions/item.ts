"use server";

import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { items } from "@drizzle/schema";
import { itemSchema, updateItemSchema } from "@/lib/validators/item";

export async function getItems() {
  const data = await db.select().from(items);
  return data;
}

export async function addItem(formData: FormData) {
  const name = formData.get("name") as string;
  const category = formData.get("category") as string;
  const imageFile = formData.get("image") as File;

  // Basic validation for required fields
  if (!name || !category) {
    return { error: "필수 필드를 모두 입력해주세요." };
  }

  let imageUrl: string | undefined;

  if (imageFile && imageFile.size > 0) {
    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    try {
      await mkdir(uploadsDir, { recursive: true });
    } catch (error) {
      console.error("Failed to create uploads directory:", error);
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
      console.error("Failed to write image file:", error);
      return { error: "이미지 파일 저장에 실패했습니다." };
    }
  }

  const data = {
    name,
    category,
    imageUrl,
  };

  const validatedData = itemSchema.safeParse(data);
  if (!validatedData.success) {
    console.error("Validation error:", validatedData.error);
    return { error: "유효하지 않은 데이터입니다." };
  }

  try {
    await db.insert(items).values({
      ...validatedData.data,
    });
    revalidatePath("/admin/stock");
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

  const dataToUpdate: { name?: string; category?: string; imageUrl?: string } = {};
  if (name) dataToUpdate.name = name;
  if (category) dataToUpdate.category = category;
  if (imageUrl) dataToUpdate.imageUrl = imageUrl;

  const validatedData = updateItemSchema.safeParse({ id, ...dataToUpdate });
  if (!validatedData.success) {
    return { error: "유효하지 않은 데이터입니다." };
  }

  try {
    await db.update(items).set(validatedData.data).where(eq(items.id, id));
    revalidatePath("/admin/stock");
    return { success: true };
  } catch (error) {
    return { error: "아이템 정보 업데이트에 실패했습니다." };
  }
}

export async function deleteItem(id: number) {
  try {
    await db.delete(items).where(eq(items.id, id));
    revalidatePath("/admin/stock");
    return { success: true };
  } catch (error) {
    return { error: "아이템 삭제에 실패했습니다." };
  }
}
