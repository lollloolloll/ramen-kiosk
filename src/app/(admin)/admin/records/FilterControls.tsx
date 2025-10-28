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

interface FilterControlsProps {
  categories: string[];
}

export function FilterControls({ categories }: FilterControlsProps) {
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
  const [category, setCategory] = React.useState(
    searchParams.get("category") || "all"
  );

  // 이전 필터 값들을 추적
  const prevFiltersRef = React.useRef({
    username: searchParams.get("username") || "",
    fromDate: searchParams.get("from") || "",
    toDate: searchParams.get("to") || "",
    category: searchParams.get("category") || "all",
  });

  React.useEffect(() => {
    const currentFilters = {
      username,
      fromDate: fromDate?.toISOString().split("T")[0] || "",
      toDate: toDate?.toISOString().split("T")[0] || "",
      category,
    };

    // 필터가 실제로 변경되었는지 확인
    const filtersChanged =
      currentFilters.username !== prevFiltersRef.current.username ||
      currentFilters.fromDate !== prevFiltersRef.current.fromDate ||
      currentFilters.toDate !== prevFiltersRef.current.toDate ||
      currentFilters.category !== prevFiltersRef.current.category;

    if (!filtersChanged) {
      return; // 필터가 변경되지 않았으면 아무것도 하지 않음
    }

    // 필터가 변경되었으므로 ref 업데이트
    prevFiltersRef.current = currentFilters;

    const handler = setTimeout(() => {
      const currentParams = new URLSearchParams(searchParams.toString());
      const sort = currentParams.get("sort");
      const order = currentParams.get("order");

      const newParams = new URLSearchParams();

      if (username) newParams.set("username", username);
      if (fromDate) newParams.set("from", fromDate.toISOString().split("T")[0]);
      if (toDate) newParams.set("to", toDate.toISOString().split("T")[0]);
      if (category && category !== "all") newParams.set("category", category);

      if (sort) newParams.set("sort", sort);
      if (order) newParams.set("order", order);

      newParams.set("page", "1");

      router.push(`/admin/records?${newParams.toString()}`);
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [username, fromDate, toDate, category, router, searchParams]);

  return (
    <div className="flex items-end space-x-4 mb-6">
      <div>
        <Label>Username</Label>
        <Input
          placeholder="Filter by username..."
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
        <Label>카테고리</Label>
        <Select onValueChange={setCategory} value={category}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="모두" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">모두</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
