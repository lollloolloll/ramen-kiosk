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
import { Pagination } from "@/lib/shared/pagination";
import { useRouter, useSearchParams } from "next/navigation"; // Import these

type GeneralUser = typeof generalUsers.$inferSelect;

interface UsersPageClientProps {
  generalUsers: GeneralUser[];
  page: number;
  per_page: number;
  total_count: number;
  sort: string; // Add sort prop
  order: string; // Add order prop
}

export function UsersPageClient({
  generalUsers,
  page,
  per_page,
  total_count,
  sort, // Destructure sort from props
  order, // Destructure order from props
}: UsersPageClientProps) {
  const router = useRouter(); // Initialize useRouter
  const searchParams = useSearchParams(); // Initialize useSearchParams

  const [searchTerm, setSearchTerm] = useState("");
  // Remove sortOrder and sortDirection states, use props instead
  // const [sortOrder, setSortOrder] = useState("name");
  // const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const handleSortChange = (newSortOrder: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("sort", newSortOrder);
    params.set("page", "1"); // Reset page to 1 when sorting changes
    router.push(`?${params.toString()}`);
  };

  const handleDirectionChange = () => {
    const params = new URLSearchParams(searchParams);
    const currentOrder = params.get("order") || "asc";
    params.set("order", currentOrder === "asc" ? "desc" : "asc");
    params.set("page", "1"); // Reset page to 1 when sorting changes
    router.push(`?${params.toString()}`);
  };

  const filteredUsers = useMemo(() => { // Renamed from filteredAndSortedUsers
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
    // Remove client-side sorting logic, as it's now handled by the server
    return filtered;
  }, [generalUsers, searchTerm]); // Remove sortOrder and sortDirection from dependencies

  return (
    <div>
      <div className="mb-8">
        <div className="flex justify-end items-center mb-4 gap-2">
          <div className="flex items-center gap-2">
            <Select onValueChange={handleSortChange} defaultValue={sort}> {/* Use handleSortChange and sort prop */}
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="정렬" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="age">나이순</SelectItem>
                <SelectItem value="name">이름순</SelectItem>
                <SelectItem value="createdAt">생성순</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={handleDirectionChange} // Use handleDirectionChange
            >
              {order === "asc" ? ( // Use order prop
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

        <DataTable columns={generalUserColumns} data={filteredUsers} /> {/* Use filteredUsers */}
      </div>
      <Pagination page={page} per_page={per_page} total_count={total_count} />
    </div>
  );
}
