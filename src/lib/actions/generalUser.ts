"use server";

import { db } from "@/lib/db";
import { generalUsers, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import { generalUserSchema } from "@/lib/validators/generalUser";
import { revalidatePath } from "next/cache";

// This is not an efficient way to query by PIN, as it requires fetching all users.
// For a small number of users, this is acceptable.
// A better approach would be to use a different authentication method if the number of users grows.
export async function getUsersByPin(pin: string) {
  const allUsers = await db.select().from(generalUsers);
  const matchingUsers = [];
  for (const user of allUsers) {
    const isMatch = await bcrypt.compare(pin, user.hashedPin);
    if (isMatch) {
      matchingUsers.push({ id: user.id, name: user.name });
    }
  }
  return matchingUsers;
}

export async function createGeneralUser(data: unknown) {
  const validatedData = generalUserSchema.safeParse(data);
  if (!validatedData.success) {
    return { error: "유효하지 않은 데이터입니다." };
  }

  const { name, phoneNumber, gender, age, pin } = validatedData.data;

  const [existingUser] = await db
    .select()
    .from(generalUsers)
    .where(eq(generalUsers.phoneNumber, phoneNumber));

  if (existingUser) {
    return { error: "이미 등록된 휴대폰 번호입니다." };
  }

  const hashedPin = await bcrypt.hash(pin, 10);

  const [newUser] = await db
    .insert(generalUsers)
    .values({
      name,
      phoneNumber,
      gender,
      age,
      hashedPin,
    })
    .returning();

  return { success: true, user: { id: newUser.id, name: newUser.name } };
}

export async function getAllGeneralUsers() {
  try {
    const allUsers = await db.select().from(generalUsers);
    return { data: allUsers };
  } catch (error) {
    return { error: "사용자 정보를 가져오는 데 실패했습니다." };
  }
}

export async function getAllAdminUsers() {
  try {
    const allUsers = await db.select().from(users);
    return { data: allUsers };
  } catch (error) {
    return { error: "관리자 정보를 가져오는 데 실패했습니다." };
  }
}

export async function deleteGeneralUser(id: number) {
  try {
    await db.delete(generalUsers).where(eq(generalUsers.id, id));
    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    return { error: "사용자 삭제에 실패했습니다." };
  }
}

export async function deleteAdminUser(id: number) {
  try {
    await db.delete(users).where(eq(users.id, id));
    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    return { error: "관리자 삭제에 실패했습니다." };
  }
}
