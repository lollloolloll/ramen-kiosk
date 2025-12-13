"use server";

import { db } from "@/lib/db";
import { generalUsers, users } from "@drizzle/schema";
import { eq, asc, desc, like, or, sql } from "drizzle-orm";
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
  per_page = 10,
  sort = "name",
  order = "asc",
  search = "",
}: {
  page?: number;
  per_page?: number;
  sort?: string;
  order?: string;
  search?: string;
}) {
  try {
    const offset = (page - 1) * per_page;

    let whereClause = undefined;

    if (search) {
      // 사용자가 입력한 검색어에서 하이픈 제거 (예: 010-1234 -> 0101234)
      // 만약 이름 검색인 경우(하이픈 없음)에는 그대로 유지됨
      const cleanSearch = search.replace(/-/g, "");

      // cleanSearch가 빈 문자열이면(검색어가 '-'만 있는 경우 등) 모든 전화번호가 검색되는 문제 방지
      if (cleanSearch.length > 0) {
        whereClause = or(
          // 1. 이름 검색 (기존 검색어 그대로 사용)
          like(generalUsers.name, `%${search}%`),

          // 2. 전화번호 검색 (DB값의 하이픈을 제거하고, 하이픈 없는 검색어와 비교)
          // SQLite의 REPLACE 함수 사용: phone_number의 '-'를 ''로 변경 후 비교
          sql`REPLACE(${
            generalUsers.phoneNumber
          }, '-', '') LIKE ${`%${cleanSearch}%`}`
        );
      } else {
        // 검색어가 특수문자로만 이루어져서 cleanSearch가 빈 값이 된 경우 이름만 검색
        whereClause = like(generalUsers.name, `%${search}%`);
      }
    }

    const [total] = await db
      .select({ value: count() })
      .from(generalUsers)
      .where(whereClause);
    const total_count = total.value;

    const orderDirection = order === "asc" ? asc : desc;
    let orderBy;

    switch (sort) {
      case "name":
        orderBy = orderDirection(generalUsers.name);
        break;
      case "age":
        orderBy = orderDirection(generalUsers.birthDate);
        break;
      case "createdAt":
        orderBy = orderDirection(generalUsers.id);
        break;
      default:
        orderBy = asc(generalUsers.name);
    }

    const allUsers = await db
      .select()
      .from(generalUsers)
      .where(whereClause)
      .orderBy(orderBy)
      .limit(per_page)
      .offset(offset);

    return { data: allUsers, total_count };
  } catch (error) {
    console.error(error);
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

import ExcelJS from "exceljs";

export async function exportGeneralUsersToExcel() {
  try {
    const allUsers = await db.select().from(generalUsers);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("쌍청문 쉬다 사용자 정보");

    worksheet.columns = [
      { header: "ID", key: "id", width: 10 },
      { header: "이름", key: "name", width: 20 },
      { header: "전화번호", key: "phoneNumber", width: 20 },
      { header: "성별", key: "gender", width: 10 },
      { header: "생년월일", key: "birthDate", width: 15 },
      { header: "학교", key: "school", width: 20 },
      { header: "개인정보동의", key: "personalInfoConsent", width: 15 },
    ];

    // 헤더 스타일 적용
    worksheet.getRow(1).eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFD3D3D3" }, // 회색
      };
      cell.font = {
        bold: true,
      };
      cell.alignment = {
        vertical: "middle",
        horizontal: "center",
      };
    });

    // 모든 데이터 셀에 가운데 정렬 적용
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 0) {
        // 헤더 행 제외
        row.eachCell((cell) => {
          cell.alignment = {
            vertical: "middle",
            horizontal: "center",
          };
        });
      }
    });

    allUsers.forEach((user) => {
      worksheet.addRow({
        id: user.id,
        name: user.name,
        phoneNumber: user.phoneNumber,
        gender: user.gender,
        birthDate: user.birthDate,
        school: user.school,
        personalInfoConsent: user.personalInfoConsent ? "Y" : "N",
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return {
      success: true,
      buffer: Buffer.from(buffer).toString("base64"),
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    };
  } catch (error) {
    console.error("Error exporting general users to Excel:", error);
    return { error: "사용자 정보를 엑셀로 내보내는 데 실패했습니다." };
  }
}

export async function getGeneralUserById(id: number) {
  try {
    const [user] = await db
      .select()
      .from(generalUsers)
      .where(eq(generalUsers.id, id));

    if (!user) {
      return { error: "사용자를 찾을 수 없습니다." };
    }
    return { success: true, data: user };
  } catch (error) {
    console.error("Error fetching general user by id:", error);
    return { error: "사용자 정보를 가져오는 데 실패했습니다." };
  }
}
