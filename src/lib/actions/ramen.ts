"use server";

import { db } from "../db";
import { ramens } from "../db/schema";

export async function getAllRamens() {
  try {
    const allRamens = await db.select().from(ramens);
    return { success: true, data: allRamens };
  } catch (error) {
    console.error("Failed to fetch ramens:", error);
    return { error: "Failed to fetch ramens." };
  }
}
