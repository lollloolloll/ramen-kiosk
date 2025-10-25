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

import { count } from "drizzle-orm";

export async function getAllGeneralUsers({ 
  page = 1, 
  per_page = 10 
}: {
  page?: number;
  per_page?: number;
}) {
  try {
    const offset = (page - 1) * per_page;
    const [total] = await db.select({ value: count() }).from(generalUsers);
    const total_count = total.value;

    const allUsers = await db.select().from(generalUsers).limit(per_page).offset(offset);
    return { data: allUsers, total_count };
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
export async function updateUser(id: number, data: unknown) {
  const validatedData = generalUserSchema.safeParse(data);
  if (!validatedData.success) {
    console.error("Validation Error:", validatedData.error.flatten());
    return {
      error:
        validatedData.error.flatten().fieldErrors.personalInfoConsent?.[0] ||
        "유효하지 않은 데이터입니다.",
    };
  }

  const { name, phoneNumber, gender, birthDate, school, personalInfoConsent } =
    validatedData.data;

  try {
    // 다른 사용자가 같은 전화번호를 사용하고 있는지 확인
    const [existingUser] = await db
      .select()
      .from(generalUsers)
      .where(eq(generalUsers.phoneNumber, phoneNumber));

    if (existingUser && existingUser.id !== id) {
      return { error: "이미 등록된 휴대폰 번호입니다." };
    }

    await db
      .update(generalUsers)
      .set({
        name,
        phoneNumber,
        gender,
        birthDate: birthDate || "",
        school: school || "",
        personalInfoConsent,
      })
      .where(eq(generalUsers.id, id));

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    console.error("Error updating general user:", error);
    return { error: "사용자 정보 업데이트에 실패했습니다." };
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
