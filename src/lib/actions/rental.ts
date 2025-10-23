"use server";

import { db } from "@/lib/db";
import { rentalRecords, ramens, users } from "@/lib/db/schema";
import { eq, and, gte, lte, InferInsertModel } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function rentRamen(userId: number, ramenId: number) {
  try {
    // db.transaction()의 콜백에서 'async'와 'await'를 제거합니다.
    // better-sqlite3는 동기적으로 작동하므로 이게 올바른 방법입니다.
    db.transaction((tx) => {
      const [ramenToRent] = tx
        .select()
        .from(ramens)
        .where(eq(ramens.id, ramenId))
        .all(); // .all() 또는 .get()을 사용하여 즉시 실행

      if (!ramenToRent) {
        throw new Error("해당 라면을 찾을 수 없습니다.");
      }

      if (ramenToRent.stock <= 0) {
        throw new Error("재고가 부족합니다.");
      }

      // 재고 감소
      tx.update(ramens)
        .set({ stock: ramenToRent.stock - 1 })
        .where(eq(ramens.id, ramenId))
        .run(); // .run()으로 즉시 실행

      // 대여 기록 추가
      tx.insert(rentalRecords)
        .values({
          userId: userId as InferInsertModel<typeof rentalRecords>["userId"],
          ramenId: ramenId as InferInsertModel<typeof rentalRecords>["ramenId"],
          rentalDate: new Date(),
        })
        .run(); // .run()으로 즉시 실행
    });

    // 트랜잭션이 성공적으로 완료되었을 때만 이 코드가 실행됩니다.
    revalidatePath("/");
    revalidatePath("/admin/stock");

    return { success: true };
  } catch (error) {
    // 트랜잭션 내부에서 throw된 에러는 여기서 잡힙니다.
    // Drizzle은 에러가 발생하면 자동으로 트랜잭션을 '롤백'합니다.
    console.error("Rental Transaction Failed:", error);

    if (error instanceof Error) {
      return { error: error.message };
    }

    return { error: "대여 처리 중 예상치 못한 오류가 발생했습니다." };
  }
}
export async function getRentalRecords(
  filters: {
    username?: string;
    startDate?: Date;
    endDate?: Date;
  } = {}
) {
  try {
    const whereConditions = [];
    let actualUserId: number | undefined;

    if (filters.username) {
      const [user] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.username, filters.username));
      if (user) {
        actualUserId = user.id;
        whereConditions.push(eq(rentalRecords.userId, actualUserId));
      } else {
        return { success: true, data: [] };
      }
    }
    if (filters.startDate) {
      whereConditions.push(gte(rentalRecords.rentalDate, filters.startDate));
    }
    if (filters.endDate) {
      whereConditions.push(lte(rentalRecords.rentalDate, filters.endDate));
    }

    const query = db
      .select({
        id: rentalRecords.id,
        rentalDate: rentalRecords.rentalDate,
        userName: users.username,
        ramenName: ramens.name,
      })
      .from(rentalRecords)
      .leftJoin(users, eq(rentalRecords.userId, users.id))
      .leftJoin(ramens, eq(rentalRecords.ramenId, ramens.id));

    if (whereConditions.length > 0) {
      // @ts-ignore
      query.where(and(...whereConditions));
    }

    const data = await query;

    return { success: true, data };
  } catch (error) {
    return { error: "대여 기록을 불러오는 데 실패했습니다." };
  }
}
