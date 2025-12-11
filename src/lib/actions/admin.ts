"use server";

import { db } from "@/lib/db"; // 또는 "@/lib/db" (프로젝트 설정에 맞게)
import { users } from "@drizzle/schema"; // 또는 "@drizzle/schema"
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// 단순화된 관리자 목록 조회 (전체 조회)
export async function getAdminList() {
  try {
    const allAdmins = await db
      .select({
        id: users.id,
        username: users.username,
        role: users.role,
      })
      .from(users)
      .orderBy(desc(users.id));

    return allAdmins;
  } catch (error) {
    console.error("Failed to fetch admins:", error);
    return [];
  }
}

// 관리자 삭제
export async function deleteAdmin(id: number) {
  try {
    await db.delete(users).where(eq(users.id, id));
    revalidatePath("/admin/accounts");
    return { success: true };
  } catch (error) {
    return { error: "관리자 삭제에 실패했습니다." };
  }
}
