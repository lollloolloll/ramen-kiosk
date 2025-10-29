"use client";

import { useState, useEffect, useMemo } from "react";
import { getRentalAnalytics } from "@/lib/actions/rental";
import { AnalyticsData } from "@/lib/types/analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Pie,
  PieChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Line,
  LineChart,
} from "recharts";
import { useDebounce } from "@/lib/shared/use-debounce";
import { Skeleton } from "@/components/ui/skeleton";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

const MemoizedAgeBarChart = ({
  data,
}: {
  data: Array<{
    name: string;
    count: number;
    uniqueUsers: number;
    percentage: number;
  }>;
}) => (
  <ResponsiveContainer width="100%" height={300}>
    <BarChart data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="name" />
      <YAxis />
      <Tooltip />
      <Legend />
      <Bar dataKey="count" fill="#8884d8" name="대여 건수" />
      <Bar dataKey="uniqueUsers" fill="#82ca9d" name="이용자 수" />
    </BarChart>
  </ResponsiveContainer>
);

const MemoizedCategoryPieChart = ({ data }: { data: any[] }) => (
  <ResponsiveContainer width="100%" height={300}>
    <PieChart>
      <Pie
        data={data}
        dataKey="totalRentals"
        nameKey="category"
        cx="50%"
        cy="50%"
        outerRadius={100}
        fill="#8884d8"
        label
      >
        {data.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
        ))}
      </Pie>
      <Tooltip formatter={(value) => `${value}건`} />
      <Legend />
    </PieChart>
  </ResponsiveContainer>
);

// ✨ 새로 추가된 요일별 차트
const MemoizedDayOfWeekChart = ({
  data,
}: {
  data: { name: string; count: number }[];
}) => (
  <ResponsiveContainer width="100%" height={300}>
    <BarChart data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="name" />
      <YAxis allowDecimals={false} />
      <Tooltip />
      <Bar dataKey="count" fill="#82ca9d" name="대여 건수" />
    </BarChart>
  </ResponsiveContainer>
);

// ✨ 새로 추가된 시간대별 차트
const MemoizedHourlyChart = ({
  data,
}: {
  data: { name: string; count: number }[];
}) => (
  <ResponsiveContainer width="100%" height={300}>
    <LineChart data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis
        dataKey="name"
        label={{ value: "시간", position: "insideBottomRight", offset: -5 }}
      />
      <YAxis allowDecimals={false} />
      <Tooltip />
      <Legend />
      <Line
        type="monotone"
        dataKey="count"
        stroke="#8884d8"
        name="대여 건수"
        activeDot={{ r: 8 }}
      />
    </LineChart>
  </ResponsiveContainer>
);

// --- 메인 컴포넌트 ---
export function RentalAnalyticsClient({
  initialData,
  categories,
}: {
  initialData: AnalyticsData;
  categories: string[];
}) {
  const [analyticsData, setAnalyticsData] =
    useState<AnalyticsData>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    year: new Date().getFullYear().toString(),
    month: "all",
    ageGroup: "all",
    category: "all",
  });

  const debouncedFilters = useDebounce(filters, 500);

  useEffect(() => {
    // initialData는 서버에서 처음 렌더링할 때만 사용하고, 이후 필터 변경 시에는 다시 fetch
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getRentalAnalytics(debouncedFilters);
        setAnalyticsData(data);
      } catch (err) {
        setError("데이터를 불러오는 데 실패했습니다.");
        console.error(err);
      }
      setLoading(false);
    };

    // 초기 렌더링이 아닌 경우에만 데이터 fetch
    if (
      JSON.stringify(debouncedFilters) !==
      JSON.stringify({
        year: new Date().getFullYear().toString(),
        month: "all",
        ageGroup: "all",
        category: "all",
      })
    ) {
      fetchData();
    }
  }, [debouncedFilters]);

  const handleFilterChange = (filterName: string, value: string) => {
    setFilters((prev) => ({ ...prev, [filterName]: value }));
  };

  const years = Array.from({ length: 5 }, (_, i) =>
    (new Date().getFullYear() - i).toString()
  );
  const ageGroupMap: { [key: string]: string } = {
    all: "전체",
    child: "아동",
    teen: "청소년",
    adult: "성인",
  };

  const ageGroupData = useMemo(
    () => [
      { name: "아동", ...analyticsData.ageGroupStats.child },
      { name: "청소년", ...analyticsData.ageGroupStats.teen },
      { name: "성인", ...analyticsData.ageGroupStats.adult },
    ],
    [analyticsData.ageGroupStats]
  );

  return (
    <div className="space-y-6">
      {/* --- 필터 섹션 --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 border rounded-lg bg-card">
        <Select
          value={filters.year}
          onValueChange={(value) => handleFilterChange("year", value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={y}>
                {y}년
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.month}
          onValueChange={(value) => handleFilterChange("month", value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[
              "all",
              ...Array.from({ length: 12 }, (_, i) => (i + 1).toString()),
            ].map((m) => (
              <SelectItem key={m} value={m}>
                {m === "all" ? "전체" : `${m}월`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.ageGroup}
          onValueChange={(value) => handleFilterChange("ageGroup", value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(ageGroupMap).map(([key, value]) => (
              <SelectItem key={key} value={key}>
                {value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.category}
          onValueChange={(value) => handleFilterChange("category", value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 카테고리</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && (
        <div className="text-red-500 p-4 border border-red-500 bg-red-100 rounded-md">
          {error}
        </div>
      )}

      {/* --- KPI 카드 섹션 --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))
        ) : (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  총 대여 건수
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {analyticsData.kpis.totalRentals.toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  총 이용자 수
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {analyticsData.kpis.uniqueUsers.toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  가장 인기 있는 품목
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-bold truncate">
                  {analyticsData.kpis.mostPopularItem?.name || "N/A"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {analyticsData.kpis.mostPopularItem?.rentals || 0}회
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  가장 인기 있는 카테고리
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-bold truncate">
                  {analyticsData.kpis.mostPopularCategory?.name || "N/A"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {analyticsData.kpis.mostPopularCategory?.rentals || 0}회
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* --- 차트 섹션 1 --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>연령 그룹별 대여 현황</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[300px]" />
            ) : (
              <MemoizedAgeBarChart data={ageGroupData} />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>카테고리별 대여 현황</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[300px]" />
            ) : (
              <MemoizedCategoryPieChart data={analyticsData.categoryStats} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* ✨ --- 새로 추가된 차트 섹션 2 --- ✨ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>요일별 대여 현황</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[300px]" />
            ) : (
              <MemoizedDayOfWeekChart
                data={
                  analyticsData.timePatternStats?.byDayOfWeek?.map((d) => ({
                    name: d.day,
                    count: d.rentals,
                  })) || []
                }
              />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>시간대별 대여 현황</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[300px]" />
            ) : (
              <MemoizedHourlyChart
                data={
                  analyticsData.timePatternStats?.byHour?.map((h) => ({
                    name: h.hour.toString(),
                    count: h.rentals,
                  })) || []
                }
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* --- 테이블 섹션 --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>인기 품목 TOP 10</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-80" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>순위</TableHead>
                    <TableHead>품목명</TableHead>
                    <TableHead className="text-right">대여 횟수</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analyticsData.itemStats.topItems.map((item, index) => (
                    <TableRow key={item.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell className="text-right">
                        {item.rentals}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>비인기 품목 (대여 5회 이하)</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-80" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>품목명</TableHead>
                    <TableHead>카테고리</TableHead>
                    <TableHead className="text-right">대여 횟수</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analyticsData.itemStats.unpopularItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell className="text-right">
                        {item.rentals}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
