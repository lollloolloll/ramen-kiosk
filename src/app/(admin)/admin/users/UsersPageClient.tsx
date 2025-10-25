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
import { ArrowUp, ArrowDown } from "lucide-react";
import { Pagination } from "@/lib/shared/pagination"; // Import Pagination component

type GeneralUser = typeof generalUsers.$inferSelect;

interface UsersPageClientProps {
  generalUsers: GeneralUser[];
  page: number;
  per_page: number;
  total_count: number;
}

export function UsersPageClient({
  generalUsers,
  page,
  per_page,
  total_count,
}: UsersPageClientProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const filteredAndSortedUsers = useMemo(() => {
    let filtered = [...generalUsers];

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

    if (sortOrder === "age") {
      filtered.sort((a, b) => {
        if (!a.birthDate) return sortDirection === "asc" ? 1 : -1;
        if (!b.birthDate) return sortDirection === "asc" ? -1 : 1;
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
        return sortDirection === "asc" ? a.id - b.id : b.id - a.id;
      });
    }

    return filtered;
  }, [generalUsers, searchTerm, sortOrder, sortDirection]);

  return (
    <div>
      <div className="mb-8">
        <div className="flex justify-end items-center mb-4 gap-2">
          <div className="flex items-center gap-2">
            <Select onValueChange={setSortOrder} defaultValue="name">
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="정렬" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">이름순</SelectItem>
                <SelectItem value="age">나이순</SelectItem>
                <SelectItem value="createdAt">생성순</SelectItem>
              </SelectContent>
            </Select>
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
              className="w-[250px] mr-2"
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
      <Pagination page={page} per_page={per_page} total_count={total_count} />
    </div>
  );
}
