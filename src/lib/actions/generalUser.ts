"use server";

import { db } from "@/lib/db";
import { generalUsers, users } from "@drizzle/schema";
import { eq } from "drizzle-orm";
import { generalUserSchema } from "@/lib/validators/generalUser";
import { revalidatePath } from "next/cache";

export async function findUserByNameAndPhone(
  name: string,
  phoneNumber: string
) {
  const user = await db.query.generalUsers.findFirst({
    where: (users, { and }) =>
      and(eq(users.name, name), eq(users.phoneNumber, phoneNumber)),
  });

  return user;
}

export async function createGeneralUser(data: unknown) {
  const validatedData = generalUserSchema.safeParse(data);
  if (!validatedData.success) {
    console.error("Validation Error:", validatedData.error.flatten());
    // 에러 메시지를 좀 더 구체적으로 반환
    return {
      error:
        validatedData.error.flatten().fieldErrors.personalInfoConsent?.[0] ||
        "유효하지 않은 데이터입니다.",
    };
  }

  const { name, phoneNumber, gender, birthDate, school, personalInfoConsent } =
    validatedData.data;

  try {
    const [existingUser] = await db
      .select()
      .from(generalUsers)
      .where(eq(generalUsers.phoneNumber, phoneNumber));

    if (existingUser) {
      return { error: "이미 등록된 휴대폰 번호입니다." };
    }

    const [newUser] = await db
      .insert(generalUsers)
      .values({
        name,
        phoneNumber,
        gender,
        birthDate: birthDate || "",
        school: school || "",
        personalInfoConsent: personalInfoConsent,
      })
      .returning();

    return { success: true, user: { id: newUser.id, name: newUser.name } };
  } catch (error) {
    console.error("Error creating general user:", error);
    return { error: "사용자 등록 중 오류가 발생했습니다." };
  }
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
