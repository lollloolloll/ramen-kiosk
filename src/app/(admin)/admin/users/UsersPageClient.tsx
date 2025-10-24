"use client";

import { useState, useMemo } from "react";
import { generalUsers } from "@drizzle/schema";
import { DataTable } from "@/components/ui/data-table";
import { generalUserColumns } from "./columns";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type GeneralUser = typeof generalUsers.$inferSelect;

interface UsersPageClientProps {
  generalUsers: GeneralUser[];
}

export function UsersPageClient({ generalUsers }: UsersPageClientProps) {
  const [filterType, setFilterType] = useState("all"); // 'all', 'year'
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("age"); // 'age', 'name', 'createdAt'

  const years = useMemo(() => {
    const allYears = generalUsers
      .filter((user) => user.birthDate)
      .map((user) => new Date(user.birthDate!).getFullYear());
    return [...new Set(allYears)].sort((a, b) => b - a);
  }, [generalUsers]);

  const filteredAndSortedUsers = useMemo(() => {
    let filtered = [...generalUsers];

    // Date filtering
    if (filterType === "year" && selectedYear) {
      filtered = filtered.filter((user) => {
        if (!user.birthDate) return false;
        const birthDate = new Date(user.birthDate);
        if (isNaN(birthDate.getTime())) return false;

        return birthDate.getFullYear() === selectedYear;
      });
    }

    // Search filtering
    if (searchTerm) {
      filtered = filtered.filter(
        (user) =>
          user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.phoneNumber?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sorting
    if (sortOrder === "age") {
      filtered.sort((a, b) => {
        if (!a.birthDate) return 1;
        if (!b.birthDate) return -1;
        return new Date(a.birthDate).getTime() - new Date(b.birthDate).getTime();
      });
    } else if (sortOrder === "name") {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortOrder === "createdAt") {
      filtered.sort((a, b) => a.id - b.id); // Assuming ID reflects creation order
    }

    return filtered;
  }, [generalUsers, filterType, selectedYear, searchTerm, sortOrder]);

  const renderDateFilters = () => {
    if (filterType === "year") {
      return (
        <Select
          onValueChange={(value) => setSelectedYear(parseInt(value))}
          defaultValue={selectedYear?.toString()}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="연도 선택" />
          </SelectTrigger>
          <SelectContent>
            {years.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}년
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    return null;
  };

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">일반 사용자 관리</h2>
        
        <div className="flex justify-between items-center mb-4 gap-2">
            <div className="flex items-center gap-2">
                <Select onValueChange={setFilterType} defaultValue="all">
                    <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="필터 기준" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">전체</SelectItem>
                        <SelectItem value="year">연도별</SelectItem>
                    </SelectContent>
                </Select>
                {renderDateFilters()}
            </div>

            <div className="flex items-center gap-2">
                <Input
                    placeholder="이름 또는 전화번호 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-[250px]"
                />
                <Select onValueChange={setSortOrder} defaultValue="age">
                    <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="정렬" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="age">나이순</SelectItem>
                        <SelectItem value="name">이름순</SelectItem>
                        <SelectItem value="createdAt">생성순</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>

        <DataTable columns={generalUserColumns} data={filteredAndSortedUsers} />
      </div>
    </div>
  );
}
