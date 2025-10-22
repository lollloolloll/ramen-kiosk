"use server";

import { eq, gt } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { ramens } from "@/lib/db/schema";
import { ramenSchema, updateRamenSchema } from "@/lib/validators/ramen";

export async function getRamens() {
  const data = await db.select().from(ramens);
  return data;
}

export async function addRamen(data: unknown) {
  const validatedData = ramenSchema.safeParse(data);
  if (!validatedData.success) {
    return { error: "유효하지 않은 데이터입니다." };
  }
  try {
    await db.insert(ramens).values({
      ...validatedData.data,
    });
    revalidatePath("/admin/stock");
    return { success: true };
  } catch (error) {
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
