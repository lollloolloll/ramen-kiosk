"use client";

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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Define the types for the props
interface AnalyticsData {
  ageGroupData: { name: string; count: number }[];
  genderData: { name: string; value: number }[];
  dayOfWeekData: { name: string; count: number }[];
  hourData: { name: string; count: number }[];
  topItems: { name: string; count: number }[];
  topUsers: { name: string; count: number }[];
  repeatRentalRate: number;
}

interface RentalAnalyticsClientProps {
  analyticsData: AnalyticsData;
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

export function RentalAnalyticsClient({
  analyticsData,
}: RentalAnalyticsClientProps) {
  const {
    ageGroupData,
    genderData,
    dayOfWeekData,
    hourData,
    topItems,
    topUsers,
    repeatRentalRate,
  } = analyticsData;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
      {/* Repeat Rental Rate */}
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>핵심 지표</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold">
            {repeatRentalRate.toFixed(1)}%
          </div>
          <p className="text-xs text-muted-foreground">재방문 대여율</p>
        </CardContent>
      </Card>

      {/* Age Group Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>연령대별 대여 분포</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={ageGroupData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Gender Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>성별 대여 분포</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={genderData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                fill="#8884d8"
                label
              >
                {genderData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Day of Week Usage */}
      <Card>
        <CardHeader>
          <CardTitle>요일별 대여 현황</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dayOfWeekData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Hourly Usage */}
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>시간대별 대여 현황</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={hourData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#8884d8"
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Item */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>인기 라면 TOP 5</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>라면</TableHead>
                <TableHead className="text-right">대여 수</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topItems.map((item) => (
                <TableRow key={item.name}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell className="text-right">{item.count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Top Users */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>최다 대여 사용자 TOP 5</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>사용자</TableHead>
                <TableHead className="text-right">대여 수</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topUsers.map((user) => (
                <TableRow key={user.name}>
                  <TableCell>{user.name}</TableCell>
                  <TableCell className="text-right">{user.count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
