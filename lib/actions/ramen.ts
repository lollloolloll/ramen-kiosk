"use server";

import { db } from "@/lib/db";
import { ramens } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { v4 as uuidv4 } from 'uuid';

const ramenSchema = z.object({
  name: z.string().min(1, "Name is required"),
  manufacturer: z.string().min(1, "Manufacturer is required"),
  stock: z.number().int().min(0, "Stock cannot be negative"),
  imageUrl: z.string().url("Invalid image URL").nullable(),
});

export async function createRamen(formData: FormData) {
  try {
    const parsed = ramenSchema.parse({
      name: formData.get("name"),
      manufacturer: formData.get("manufacturer"),
      stock: parseInt(formData.get("stock") as string),
      imageUrl: formData.get("imageUrl") || null,
    });

    await db.insert(ramens).values({
      id: uuidv4(),
      name: parsed.name,
      manufacturer: parsed.manufacturer,
      stock: parsed.stock,
      imageUrl: parsed.imageUrl,
    });

    revalidatePath("/admin/stock");
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0].message };
    }
    console.error("Create ramen error:", error);
    return { error: "An unexpected error occurred." };
  }
}

export async function updateRamen(id: string, formData: FormData) {
  try {
    const parsed = ramenSchema.parse({
      name: formData.get("name"),
      manufacturer: formData.get("manufacturer"),
      stock: parseInt(formData.get("stock") as string),
      imageUrl: formData.get("imageUrl") || null,
    });

    await db.update(ramens)
      .set({
        name: parsed.name,
        manufacturer: parsed.manufacturer,
        stock: parsed.stock,
        imageUrl: parsed.imageUrl,
      })
      .where(eq(ramens.id, id));

    revalidatePath("/admin/stock");
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0].message };
    }
    console.error("Update ramen error:", error);
    return { error: "An unexpected error occurred." };
  }
}

export async function deleteRamen(id: string) {
  try {
    await db.delete(ramens).where(eq(ramens.id, id));
    revalidatePath("/admin/stock");
    return { success: true };
  } catch (error) {
    console.error("Delete ramen error:", error);
    return { error: "An unexpected error occurred." };
  }
}
