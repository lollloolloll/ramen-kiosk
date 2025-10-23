import { db } from "@/lib/db";
import { getRentalRecords } from "@/lib/actions/rental";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminDashboardPage() {
  const allRamens = await db.query.ramens.findMany();
  const allRentalsResult = await getRentalRecords();
  const allUsers = await db.query.users.findMany();

  const totalStock = allRamens.reduce((sum, ramen) => sum + ramen.stock, 0);
  const ramenTypesCount = allRamens.length;
  const totalRentals = allRentalsResult.data?.length ?? 0;
  const userCount = allUsers.length;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">대시보드</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 라면 재고</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStock}개</div>
            <p className="text-xs text-muted-foreground">
              모든 종류의 라면 재고 합계
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">라면 종류</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ramenTypesCount}종</div>
            <p className="text-xs text-muted-foreground">
              등록된 라면의 총 종류
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 대여 수</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{totalRentals}회</div>
            <p className="text-xs text-muted-foreground">
              지금까지의 총 대여 기록
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">등록된 사용자</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userCount}명</div>
            <p className="text-xs text-muted-foreground">
              시스템에 등록된 총 사용자 수
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
