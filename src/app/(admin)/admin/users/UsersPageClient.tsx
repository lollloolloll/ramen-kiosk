"use client";

import { useState, useEffect } from "react";
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
import { useRouter, useSearchParams } from "next/navigation";
import { useDebounce } from "@/lib/shared/use-debounce";

type GeneralUser = typeof generalUsers.$inferSelect;

interface UsersPageClientProps {
  generalUsers: GeneralUser[];
  page: number;
  per_page: number;
  total_count: number;
  sort: string;
  order: string;
  search: string;
}

export function UsersPageClient({
  generalUsers,
  page,
  per_page,
  total_count,
  sort,
  order,
  search,
}: UsersPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [searchTerm, setSearchTerm] = useState(search);
  const debouncedSearch = useDebounce(searchTerm, 500);

  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (debouncedSearch) {
      params.set("search", debouncedSearch);
    } else {
      params.delete("search");
    }
    params.set("page", "1");
    router.push(`?${params.toString()}`);
  }, [debouncedSearch, router, searchParams]);

  const handleSortChange = (newSortOrder: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("sort", newSortOrder);
    params.set("page", "1");
    router.push(`?${params.toString()}`);
  };

  const handleDirectionChange = () => {
    const params = new URLSearchParams(searchParams);
    const currentOrder = params.get("order") || "asc";
    params.set("order", currentOrder === "asc" ? "desc" : "asc");
    params.set("page", "1");
    router.push(`?${params.toString()}`);
  };

  return (
    <div>
      <div className="mb-8">
        <div className="flex justify-end items-center mb-4 gap-2">
          <div className="flex items-center gap-2">
            <Select onValueChange={handleSortChange} value={sort}>
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
              onClick={handleDirectionChange}
            >
              {order === "asc" ? (
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

        <DataTable columns={generalUserColumns} data={generalUsers} />
      </div>
      <Pagination page={page} per_page={per_page} total_count={total_count} />
    </div>
  );
}
