"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ArrowUp, ArrowDown, FileDown } from "lucide-react";
import { exportRentalRecordsToExcel } from "@/lib/actions/rental";

interface FilterControlsProps {
  items: string[];
  sort: string;
  order: string;
}

export function FilterControls({ items, sort, order }: FilterControlsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [username, setUsername] = React.useState(
    searchParams.get("username") || ""
  );
  const [fromDate, setFromDate] = React.useState<Date | undefined>(
    searchParams.get("from") ? new Date(searchParams.get("from")!) : undefined
  );
  const [toDate, setToDate] = React.useState<Date | undefined>(
    searchParams.get("to") ? new Date(searchParams.get("to")!) : undefined
  );
  const [item, setItem] = React.useState(searchParams.get("item") || "all");

  const prevFiltersRef = React.useRef({
    username: searchParams.get("username") || "",
    fromDate: searchParams.get("from") || "",
    toDate: searchParams.get("to") || "",
    item: searchParams.get("item") || "all",
  });

  const currentFilters = React.useMemo(() => {
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    return {
      username,
      startDate: fromDate ? formatDate(fromDate) : undefined,
      endDate: toDate ? formatDate(toDate) : undefined,
      itemName: item && item !== "all" ? item : undefined,
    };
  }, [username, fromDate, toDate, item]);

  React.useEffect(() => {
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    const currentFilters = {
      username,
      fromDate: fromDate ? formatDate(fromDate) : "",
      toDate: toDate ? formatDate(toDate) : "",
      item,
    };

    const filtersChanged =
      currentFilters.username !== prevFiltersRef.current.username ||
      currentFilters.fromDate !== prevFiltersRef.current.fromDate ||
      currentFilters.toDate !== prevFiltersRef.current.toDate ||
      currentFilters.item !== prevFiltersRef.current.item;

    if (!filtersChanged) {
      return;
    }

    prevFiltersRef.current = currentFilters;

    const handler = setTimeout(() => {
      const currentParams = new URLSearchParams(searchParams.toString());
      const sort = currentParams.get("sort");
      const order = currentParams.get("order");

      const newParams = new URLSearchParams();

      if (username) newParams.set("username", username);
      if (fromDate) newParams.set("from", formatDate(fromDate));
      if (toDate) newParams.set("to", formatDate(toDate));
      if (item && item !== "all") newParams.set("item", item);

      if (sort) newParams.set("sort", sort);
      if (order) newParams.set("order", order);

      newParams.set("page", "1");

      router.push(`/admin/records?${newParams.toString()}`);
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [username, fromDate, toDate, item, router, searchParams, currentFilters]);

  const handleSortChange = (newSortOrder: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("sort", newSortOrder);
    params.set("page", "1");
    router.push(`?${params.toString()}`);
  };

  const handleDirectionChange = () => {
    const params = new URLSearchParams(searchParams);
    const currentOrder = params.get("order") || "desc";
    params.set("order", currentOrder === "asc" ? "desc" : "asc");
    params.set("page", "1");
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="flex items-end space-x-4 mb-6 w-full">
      <div>
        <Label>이름</Label>
        <Input
          placeholder="이름..."
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="max-w-sm"
        />
      </div>
      <div>
        <Label>From</Label>
        <DatePicker date={fromDate} setDate={setFromDate} />
      </div>
      <div>
        <Label>To</Label>
        <DatePicker date={toDate} setDate={setToDate} />
      </div>
      <div>
        <Label>물품명</Label>
        <Select onValueChange={setItem} value={item}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="모두" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">모두</SelectItem>
            {items.map((itemName) => (
              <SelectItem key={itemName} value={itemName}>
                {itemName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>정렬</Label>
        <div className="flex items-center space-x-2">
          <Select onValueChange={handleSortChange} value={sort}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="정렬" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rentalDate">대여일시</SelectItem>
              <SelectItem value="username">사용자명</SelectItem>
              <SelectItem value="peopleCount">대여인원</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={handleDirectionChange}>
            {order === "asc" ? (
              <ArrowUp className="h-4 w-4" />
            ) : (
              <ArrowDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
      <div>
        <Button
          onClick={async () => {
            const result = await exportRentalRecordsToExcel(currentFilters);
            if (result.success && result.buffer && result.mimeType) {
              const link = document.createElement("a");
              link.href = `data:${result.mimeType};base64,${result.buffer}`;
              link.download = `쌍청문_쉬다_대여기록_${new Date().toISOString()}.xlsx`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            } else {
              alert(result.error || "엑셀 내보내기 실패");
            }
          }}
          className="flex items-center space-x-2"
        >
          <FileDown className="h-4 w-4" />
          <span>엑셀 내보내기</span>
        </Button>
      </div>
    </div>
  );
}
