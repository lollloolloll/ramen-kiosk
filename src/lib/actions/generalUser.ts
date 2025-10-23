"use server";

import { db } from "@/lib/db";
import { generalUsers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import { generalUserSchema } from "@/lib/validators/generalUser";

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
