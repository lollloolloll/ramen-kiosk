"use server"

import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { eq, gt } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { ramens } from "@drizzle/schema";
import { ramenSchema, updateRamenSchema } from "@/lib/validators/ramen";

export async function getRamens() {
  const data = await db.select().from(ramens);
  return data;
}

export async function addRamen(formData: FormData) {
  const name = formData.get("name") as string;
  const manufacturer = formData.get("manufacturer") as string;
  const stock = parseInt(formData.get("stock") as string);
  const imageFile = formData.get("image") as File;

  // Basic validation for required fields
  if (!name || !manufacturer || isNaN(stock)) {
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
    manufacturer,
    stock,
    imageUrl,
  };

  const validatedData = ramenSchema.safeParse(data);
  if (!validatedData.success) {
    console.error("Validation error:", validatedData.error);
    return { error: "유효하지 않은 데이터입니다." };
  }

  try {
    await db.insert(ramens).values({
      ...validatedData.data,
    });
    revalidatePath("/admin/stock");
    return { success: true };
  } catch (error) {
    console.error("Failed to add ramen:", error);
    return { error: "라면 추가에 실패했습니다." };
  }
}

export async function updateRamen(data: unknown) {
  const validatedData = updateRamenSchema.safeParse(data);
  if (!validatedData.success) {
    return { error: "유효하지 않은 데이터입니다." };
  }
  const { id, ...rest } = validatedData.data;
  try {
    await db.update(ramens).set(rest).where(eq(ramens.id, id));
    revalidatePath("/admin/stock");
    return { success: true };
  } catch (error) {
    return { error: "라면 정보 업데이트에 실패했습니다." };
  }
}

export async function deleteRamen(id: number) {
  try {
    await db.delete(ramens).where(eq(ramens.id, id));
    revalidatePath("/admin/stock");
    return { success: true };
  } catch (error) {
    return { error: "라면 삭제에 실패했습니다." };
  }
}

export async function getAvailableRamens() {
  const data = await db.select().from(ramens).where(gt(ramens.stock, 0));
  return data;
}
