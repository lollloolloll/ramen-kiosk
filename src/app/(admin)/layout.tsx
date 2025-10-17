import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  // 1. 세션 존재 여부 확인
  if (!session || !session.userId) {
    redirect("/login");
  }

  // 2. 여기서 session.userId를 string으로 강제 변환 (Type Assertion)
  const userId = session.userId as string;

  const user = await db.query.users.findFirst({
    // 3. 변환된 userId 사용
    where: eq(users.id, userId),
  });

  if (user?.role !== "ADMIN") {
    redirect("/"); // Or to an access denied page
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
