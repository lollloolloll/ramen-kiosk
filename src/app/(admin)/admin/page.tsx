// src/app/(admin)/admin/page.tsx

export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import {
  getRentalAnalytics,
  getAllItemNames,
  getAvailableRentalYears,
} from "@/lib/actions/rental";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RentalAnalyticsClient } from "./RentalAnalyticsClient";
import { items, rentalRecords } from "@drizzle/schema";
import { sql, eq } from "drizzle-orm";

export default async function AdminDashboardPage() {
  const initialFilters = {
    year: new Date().getFullYear().toString(),
    month: "all",
    ageGroup: "all",
    category: "all",
  };

  const initialData = await getRentalAnalytics(initialFilters);

  const categoryResult = await db
    .selectDistinct({ category: items.category })
    .from(items)
    .where(eq(items.isDeleted, false));
  const categories = categoryResult.map((c) => c.category).filter(Boolean);

  const { success: yearsSuccess, data: availableYearsData } =
    await getAvailableRentalYears();
  const availableYears =
    yearsSuccess && availableYearsData ? availableYearsData : [];

  const allItems = await db.query.items.findMany({
    where: eq(items.isDeleted, false),
  });
  const allUsers = await db.query.generalUsers.findMany();
  const totalRentalsResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(rentalRecords);

  const itemTypesCount = allItems.length;
  const totalRentals = totalRentalsResult[0].count;
  const userCount = allUsers.length;

  return (
    <div className="container px-16 py-10">
      <h1 className="text-3xl font-bold mb-4">대시보드</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Summary Cards */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">아이템 종류</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{itemTypesCount}종</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 대여 수</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{totalRentals}회</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">등록된 사용자</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userCount}명</div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Section */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">대여 데이터 분석</h2>
        <RentalAnalyticsClient
          initialData={initialData}
          categories={categories}
          availableYears={availableYears} // availableYears prop 전달
        />
      </div>
    </div>
  );
}
