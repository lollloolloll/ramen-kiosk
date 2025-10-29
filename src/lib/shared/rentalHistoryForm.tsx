"use client";

import { useState, useEffect, useRef } from "react";
import { getRentalRecordsByUserId } from "@/lib/actions/rental";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from "lucide-react";

type RentalRecord = {
  id: number;
  rentalDate: number;
  userName: string | null;
  itemName: string | null;
  itemCategory: string | null;
  peopleCount: number;
  imageUrl: string | null;
};

interface RentalHistoryFormProps {
  userId: number;
  username: string;
  availableItems?: string[]; // 사용 가능한 물품명 목록
}

export const rentalHistoryColumns: ColumnDef<RentalRecord>[] = [
  {
    accessorKey: "itemName",
    header: "대여 물품",
  },
  {
    accessorKey: "rentalDate",
    header: "대여일",
    cell: ({ row }) => {
      const date = row.getValue("rentalDate");
      return date
        ? new Date((date as number) * 1000).toLocaleString("ko-KR")
        : "";
    },
  },
  {
    accessorKey: "peopleCount",
    header: "대여인원",
  },
];

// 간소화된 페이지네이션 컴포넌트
function SimplePagination({
  page,
  per_page,
  total_count,
  onPageChange,
  onPerPageChange,
}: {
  page: number;
  per_page: number;
  total_count: number;
  onPageChange: (page: number) => void;
  onPerPageChange: (per_page: number) => void;
}) {
  const total_pages = Math.ceil(total_count / per_page) || 1;

  return (
    <div className="flex items-center justify-between">
      <div className="text-sm text-muted-foreground">
        총 {total_count}개 중 {(page - 1) * per_page + 1}-
        {Math.min(page * per_page, total_count)}개 표시
      </div>

      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="text-sm font-medium">
          {page} / {total_pages}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page === total_pages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        <Select
          value={`${per_page}`}
          onValueChange={(value) => onPerPageChange(Number(value))}
        >
          <SelectTrigger className="h-8 w-[70px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[5, 10, 15, 20].map((size) => (
              <SelectItem key={size} value={`${size}`}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export function RentalHistoryForm({
  userId,
  username,
  availableItems = [],
}: RentalHistoryFormProps) {
  const [records, setRecords] = useState<RentalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // 필터 상태
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [toDate, setToDate] = useState<Date | undefined>(undefined);
  const [itemName, setItemName] = useState<string>("all");
  const [sort, setSort] = useState<string>("rentalDate");
  const [order, setOrder] = useState<string>("desc");

  const prevFiltersRef = useRef({
    fromDate: "",
    toDate: "",
    itemName: "all",
    sort: "rentalDate",
    order: "desc",
  });
  const isInitialMount = useRef(true);

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    const currentFilters = {
      fromDate: fromDate ? formatDate(fromDate) : "",
      toDate: toDate ? formatDate(toDate) : "",
      itemName,
      sort,
      order,
    };

    const filtersChanged =
      currentFilters.fromDate !== prevFiltersRef.current.fromDate ||
      currentFilters.toDate !== prevFiltersRef.current.toDate ||
      currentFilters.itemName !== prevFiltersRef.current.itemName ||
      currentFilters.sort !== prevFiltersRef.current.sort ||
      currentFilters.order !== prevFiltersRef.current.order;

    const doFetch = () => {
      prevFiltersRef.current = currentFilters;

      async function fetchRentalHistory() {
        const isFilterAction = filtersChanged;
        if (isInitialMount.current || isFilterAction) {
          setLoading(true);
        }

        const result = await getRentalRecordsByUserId(userId, {
          page,
          per_page: perPage,
          startDate: fromDate ? formatDate(fromDate) : undefined,
          endDate: toDate ? formatDate(toDate) : undefined,
          itemName: itemName !== "all" ? itemName : undefined,
          sort,
          order,
        });

        if (result.error || !result.data) {
          setError(result.error || "대여 기록을 불러오는데 실패했습니다.");
          setRecords([]);
          setTotalCount(0);
        } else {
          setRecords(result.data);
          setTotalCount(result.total_count || 0);
          setError(null);
        }
        setLoading(false);
        if (isInitialMount.current) {
          isInitialMount.current = false;
        }
      }

      if (username) {
        fetchRentalHistory();
      }
    };

    const debounceMs = filtersChanged ? 300 : 0;
    const handler = setTimeout(doFetch, debounceMs);

    return () => clearTimeout(handler);
  }, [
    userId,
    username,
    page,
    perPage,
    fromDate,
    toDate,
    itemName,
    sort,
    order,
  ]);

  // 필터가 변경되면 페이지를 1로 리셋합니다.
  useEffect(() => {
    if (!isInitialMount.current) {
      setPage(1);
    }
  }, [fromDate, toDate, itemName, sort, order, perPage]);

  const handlePerPageChange = (newPerPage: number) => {
    setPerPage(newPerPage);
    setPage(1);
  };

  const handleSortChange = (newSort: string) => {
    setSort(newSort);
    setPage(1);
  };

  const handleDirectionChange = () => {
    setOrder(order === "asc" ? "desc" : "asc");
    setPage(1);
  };

  return (
    <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{username}님의 대여 기록</DialogTitle>
      </DialogHeader>

      {/* 필터 컨트롤 */}
      <div className="flex flex-wrap items-end gap-4 mb-4">
        <div>
          <Label className="text-xs">시작일</Label>
          <DatePicker date={fromDate} setDate={setFromDate} />
        </div>
        <div>
          <Label className="text-xs">종료일</Label>
          <DatePicker date={toDate} setDate={setToDate} />
        </div>
        <div>
          <Label className="text-xs">물품명</Label>
          <Select onValueChange={setItemName} value={itemName}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="모두" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">모두</SelectItem>
              {availableItems.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">정렬</Label>
          <div className="flex items-center space-x-1">
            <Select onValueChange={handleSortChange} value={sort}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rentalDate">대여일시</SelectItem>
                <SelectItem value="itemName">물품명</SelectItem>
                <SelectItem value="peopleCount">대여인원</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={handleDirectionChange}
              className="shrink-0"
            >
              {order === "asc" ? (
                <ArrowUp className="h-4 w-4" />
              ) : (
                <ArrowDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      <div>
        {loading ? (
          <p className="text-center py-8">로딩 중...</p>
        ) : error ? (
          <p className="text-center py-8 text-red-500">오류: {error}</p>
        ) : records.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">
            대여 기록이 없습니다.
          </p>
        ) : (
          <>
            <DataTable columns={rentalHistoryColumns} data={records} />
            <div className="mt-4">
              <SimplePagination
                page={page}
                per_page={perPage}
                total_count={totalCount}
                onPageChange={setPage}
                onPerPageChange={handlePerPageChange}
              />
            </div>
          </>
        )}
      </div>
    </DialogContent>
  );
}
