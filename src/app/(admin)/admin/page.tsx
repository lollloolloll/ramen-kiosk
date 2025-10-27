// src/app/(admin)/admin/page.tsx

import { db } from "@/lib/db";
import { getRentalRecordsWithUserDetails } from "@/lib/actions/rental";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { RentalAnalyticsClient } from "./RentalAnalyticsClient";

// 1. 대여 기록 데이터에 대한 타입을 명확하게 정의합니다.
// 이 타입은 getRentalRecordsWithUserDetails 함수의 반환값 구조와 일치해야 합니다.
// 실제 필드명에 맞게 수정해주세요.
interface RentalRecord {
  id: number;
  rentalDate: number;
  itemName: string | null;
  userName: string | null;
  userId: number | null;
  userAge: number | null;
  userGender: string | null;
}

// 2. processAnalytics 함수의 매개변수 타입을 any[] 대신 정의한 타입으로 변경합니다.
const processAnalytics = (records: RentalRecord[]) => {
  if (!records || records.length === 0) {
    return {
      ageGroupData: [],
      genderData: [],
      dayOfWeekData: [],
      hourData: [],
      topItems: [],
      topUsers: [],
      repeatRentalRate: 0,
    };
  }

  // Age Group
  const ageGroups = {
    "10대": 0,
    "20대": 0,
    "30대": 0,
    "40대 이상": 0,
  };
  records.forEach((r) => {
    if (r.userAge) {
      if (r.userAge < 20) ageGroups["10대"]++;
      else if (r.userAge < 30) ageGroups["20대"]++;
      else if (r.userAge < 40) ageGroups["30대"]++;
      else ageGroups["40대 이상"]++;
    }
  });
  const ageGroupData = Object.entries(ageGroups).map(([name, count]) => ({
    name,
    count,
  }));

  // Gender
  const genders = { 남: 0, 여: 0 };
  records.forEach((r) => {
    if (r.userGender === "남") genders["남"]++;
    else if (r.userGender === "여") genders["여"]++;
  });
  const genderData = Object.entries(genders).map(([name, value]) => ({
    name,
    value,
  }));

  // Day of Week
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const dayOfWeekCounts = Array(7).fill(0);
  records.forEach((r) => {
    const day = new Date(r.rentalDate).getDay();
    dayOfWeekCounts[day]++;
  });
  const dayOfWeekData = dayOfWeekCounts.map((count, i) => ({
    name: days[i],
    count,
  }));

  // Hour of Day
  const hourCounts = Array(24).fill(0);
  records.forEach((r) => {
    const hour = new Date(r.rentalDate).getHours();
    hourCounts[hour]++;
  });
  const hourData = hourCounts.map((count, i) => ({ name: `${i}시`, count }));

  // Top Items
  const  itemCounts = records.reduce((acc, r) => {
    if (r. itemName) acc[r. itemName] = (acc[r. itemName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const topItems = Object.entries( itemCounts)
    .sort((a, b) => b[1] - a[1]) // 이제 a[1]과 b[1]은 number 타입으로 올바르게 추론됩니다.
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  // Top Users
  const userCounts = records.reduce((acc, r) => {
    if (r.userName) acc[r.userName] = (acc[r.userName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const topUsers = Object.entries(userCounts)
    .sort((a, b) => b[1] - a[1]) // 여기도 마찬가지입니다.
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  // Repeat Rental Rate
  const uniqueUsers = new Set(records.map((r) => r.userId));
  // 3. Object.values(userCounts)의 타입이 number[]로 추론되므로, filter 콜백의 count 타입을 명시할 필요가 없습니다.
  const usersWithMultipleRentals = Object.values(userCounts).filter(
    (count) => count > 1
  ).length;
  const repeatRentalRate =
    uniqueUsers.size > 0
      ? (usersWithMultipleRentals / uniqueUsers.size) * 100
      : 0;

  return {
    ageGroupData,
    genderData,
    dayOfWeekData,
    hourData,
    topItems,
    topUsers,
    repeatRentalRate,
  };
};

export default async function AdminDashboardPage() {
  const allItems = await db.query.items.findMany();
  const allUsers = await db.query.generalUsers.findMany();
  const rentalDetailsResult = await getRentalRecordsWithUserDetails();

  const totalStock = allItems.reduce((sum,  item) => sum +  item.stock, 0);
  const  itemTypesCount = allItems.length;
  const totalRentals = rentalDetailsResult.data?.length ?? 0;
  const userCount = allUsers.length;

  // 4. rentalDetailsResult.data가 `RentalRecord[] | undefined` 타입이 되므로, 타입이 안전해집니다.
  const analyticsData = processAnalytics(rentalDetailsResult.data || []);

  return (
    <div className="container px-16 py-10">
      <h1 className="text-3xl font-bold mb-4">대시보드</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Summary Cards */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 라면 재고</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStock}개</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">라면 종류</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ itemTypesCount}종</div>
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
        {/* 이제 analyticsData의 타입이 RentalAnalyticsClient가 기대하는 AnalyticsData 타입과 일치하여 에러가 사라집니다. */}
        <RentalAnalyticsClient analyticsData={analyticsData} />
      </div>
    </div>
  );
}
