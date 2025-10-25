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
import { AddUserForm } from "./AddUserForm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowUp, ArrowDown } from "lucide-react"; // Import ArrowUp and ArrowDown

type GeneralUser = typeof generalUsers.$inferSelect;

interface UsersPageClientProps {
  generalUsers: GeneralUser[];
}

export function UsersPageClient({ generalUsers }: UsersPageClientProps) {
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("age"); // 'age', 'name', 'createdAt'
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc"); // New state for sort direction

  const years = useMemo(() => {
    const allYears = generalUsers
      .filter((user) => user.birthDate)
      .map((user) => new Date(user.birthDate!).getFullYear());
    return [...new Set(allYears)].sort((a, b) => b - a);
  }, [generalUsers]);

  const filteredAndSortedUsers = useMemo(() => {
    let filtered = [...generalUsers];

    // Date filtering
    if (selectedYear) {
      filtered = filtered.filter((user) => {
        if (!user.birthDate) return false;
        const birthDate = new Date(user.birthDate);
        if (isNaN(birthDate.getTime())) return false;

        return birthDate.getFullYear() === selectedYear;
      });
    }

    if (searchTerm) {
      const normalizedSearch = searchTerm.replace(/-/g, "").toLowerCase();

      filtered = filtered.filter((user) => {
        const nameMatch = user.name.toLowerCase().includes(normalizedSearch);
        const phoneMatch = user.phoneNumber
          ? user.phoneNumber
              .replace(/-/g, "")
              .toLowerCase()
              .includes(normalizedSearch)
          : false;
        return nameMatch || phoneMatch;
      });
    }

    // Sorting
    if (sortOrder === "age") {
      filtered.sort((a, b) => {
        if (!a.birthDate) return sortDirection === "asc" ? 1 : -1; // Handle null birthDate
        if (!b.birthDate) return sortDirection === "asc" ? -1 : 1; // Handle null birthDate
        const dateA = new Date(a.birthDate).getTime();
        const dateB = new Date(b.birthDate).getTime();
        return sortDirection === "asc" ? dateA - dateB : dateB - dateA;
      });
    } else if (sortOrder === "name") {
      filtered.sort((a, b) => {
        const nameA = a.name.toLowerCase();
        const nameB = b.name.toLowerCase();
        return sortDirection === "asc"
          ? nameA.localeCompare(nameB)
          : nameB.localeCompare(nameA);
      });
    } else if (sortOrder === "createdAt") {
      filtered.sort((a, b) => {
        return sortDirection === "asc" ? a.id - b.id : b.id - a.id; // Assuming ID reflects creation order
      });
    }

    return filtered;
  }, [
    generalUsers,
    selectedYear,
    searchTerm,
    sortOrder,
    sortDirection,
  ]); // Added sortDirection to dependencies

  const renderYearSelect = () => {
    return (
      <Select
        onValueChange={(value) =>
          setSelectedYear(value === "all" ? null : parseInt(value))
        }
        defaultValue={selectedYear?.toString() || "all"}
      >
        <SelectTrigger className="w-[120px]">
          <SelectValue placeholder="연도 선택" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">전체</SelectItem>
          {years.map((year) => (
            <SelectItem key={year} value={year.toString()}>
              {year}년
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };

  return (
    <div>
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4 gap-2">
          <div className="flex items-center gap-2">
            {renderYearSelect()}
          </div>

          <div className="flex items-center gap-2">
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
            {/* Sort Direction Toggle Button */}
            <Button
              variant="outline"
              size="icon"
              onClick={() =>
                setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
              }
            >
              {sortDirection === "asc" ? (
                <ArrowUp className="h-4 w-4" />
              ) : (
                <ArrowDown className="h-4 w-4" />
              )}
            </Button>
            <Input
              placeholder="이름 또는 전화번호 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-[250px]"
            />
            <Dialog>
              <DialogTrigger asChild>
                <Button>사용자 추가</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>사용자 추가</DialogTitle>
                </DialogHeader>
                <AddUserForm />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <DataTable columns={generalUserColumns} data={filteredAndSortedUsers} />
      </div>
    </div>
  );
}
