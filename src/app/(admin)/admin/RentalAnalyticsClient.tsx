'use client';

import { useState, useEffect, useMemo } from 'react';
import { getRentalAnalytics } from '@/lib/actions/rental';
import { AnalyticsData } from '@/lib/types/analytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Bar, BarChart, CartesianGrid, Legend, Pie, PieChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, Line, LineChart } from 'recharts';
import { useDebounce } from '@/lib/shared/use-debounce';
import { Skeleton } from '@/components/ui/skeleton';

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

const MemoizedBarChart = ({ data }) => (
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

const MemoizedPieChart = ({ data }: { data: any[] }) => (
    <ResponsiveContainer width="100%" height={300}>
        <PieChart>
            <Pie data={data} dataKey="totalRentals" nameKey="category" cx="50%" cy="50%" outerRadius={100} fill="#8884d8" label>
                {data.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
            </Pie>
            <Tooltip />
            <Legend />
        </PieChart>
    </ResponsiveContainer>
);

export function RentalAnalyticsClient({ initialData, categories }: { initialData: AnalyticsData, categories: string[] }) {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    year: new Date().getFullYear().toString(),
    month: 'all',
    ageGroup: 'all',
    category: 'all',
  });

  const debouncedFilters = useDebounce(filters, 500);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getRentalAnalytics(debouncedFilters);
        setAnalyticsData(data);
      } catch (err) {
        setError('Failed to fetch analytics data.');
        console.error(err);
      }
      setLoading(false);
    };
    fetchData();
  }, [debouncedFilters]);

  const handleFilterChange = (filterName: string, value: string) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const years = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString());
  const months = ['all', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
  const ageGroups = ['all', 'child', 'teen', 'adult'];

  const ageGroupData = useMemo(() => Object.entries(analyticsData.ageGroupStats).map(([name, value]) => ({ name, ...value })), [analyticsData.ageGroupStats]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Select value={filters.year} onValueChange={(value) => handleFilterChange('year', value)}><SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger><SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent></Select>
        <Select value={filters.month} onValueChange={(value) => handleFilterChange('month', value)}><SelectTrigger><SelectValue placeholder="Month" /></SelectTrigger><SelectContent>{months.map(m => <SelectItem key={m} value={m}>{m === 'all' ? '전체' : `${m}월`}</SelectItem>)}</SelectContent></Select>
        <Select value={filters.ageGroup} onValueChange={(value) => handleFilterChange('ageGroup', value)}><SelectTrigger><SelectValue placeholder="Age Group" /></SelectTrigger><SelectContent>{ageGroups.map(ag => <SelectItem key={ag} value={ag}>{ag}</SelectItem>)}</SelectContent></Select>
        <Select value={filters.category} onValueChange={(value) => handleFilterChange('category', value)}><SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger><SelectContent><SelectItem value="all">전체</SelectItem>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
      </div>

      {error && <div className="text-red-500">{error}</div>}

      {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
          </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card><CardHeader><CardTitle>총 대여 건수</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{analyticsData.kpis.totalRentals}</p></CardContent></Card>
            <Card><CardHeader><CardTitle>총 이용자 수</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{analyticsData.kpis.uniqueUsers}</p></CardContent></Card>
            <Card><CardHeader><CardTitle>인기 품목</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{analyticsData.kpis.mostPopularItem?.name || 'N/A'}</p></CardContent></Card>
            <Card><CardHeader><CardTitle>인기 카테고리</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{analyticsData.kpis.mostPopularCategory?.name || 'N/A'}</p></CardContent></Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>연령 그룹별 대여 현황</CardTitle></CardHeader>
          <CardContent>{loading ? <Skeleton className="h-[300px]" /> : <MemoizedBarChart data={ageGroupData} />}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>카테고리별 대여 현황</CardTitle></CardHeader>
          <CardContent>{loading ? <Skeleton className="h-[300px]" /> : <MemoizedPieChart data={analyticsData.categoryStats} />}</CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader><CardTitle>인기 품목 TOP 10</CardTitle></CardHeader>
        <CardContent>
            {loading ? <Skeleton className="h-80" /> : (
                <Table>
                    <TableHeader><TableRow><TableHead>순위</TableHead><TableHead>품목명</TableHead><TableHead>카테고리</TableHead><TableHead>대여 횟수</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {analyticsData.itemStats.topItems.map((item, index) => (
                            <TableRow key={item.id}><TableCell>{index + 1}</TableCell><TableCell>{item.name}</TableCell><TableCell>{item.category}</TableCell><TableCell>{item.rentals}</TableCell></TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </CardContent>
      </Card>

    </div>
  );
}