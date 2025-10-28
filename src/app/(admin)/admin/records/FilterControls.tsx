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

  // URL 파라미터로 초기 상태 설정
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

  const isInitialRender = React.useRef(true);

  React.useEffect(() => {
    // ▼▼▼ 2. 초기 렌더링일 경우, 아무것도 하지 않고 종료 ▼▼▼
    // ref 값을 false로 바꿔서 다음 렌더링부터는 이 로직이 실행되도록 합니다.
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }

    // 이제 이 코드는 사용자가 필터 값을 '직접' 변경했을 때만 실행됩니다.
    const handler = setTimeout(() => {
      // 정렬(sort)과 순서(order) 파라미터는 유지하기 위해 현재 URL에서 가져옵니다.
      const currentParams = new URLSearchParams(searchParams.toString());
      const sort = currentParams.get("sort");
      const order = currentParams.get("order");

      // 새로운 URL 파라미터를 처음부터 만듭니다.
      const newParams = new URLSearchParams();

      // 필터 상태값들을 newParams에 추가합니다.
      if (username) newParams.set("username", username);
      if (fromDate) newParams.set("from", fromDate.toISOString().split("T")[0]);
      if (toDate) newParams.set("to", toDate.toISOString().split("T")[0]);
      if (category && category !== "all") newParams.set("category", category);

      // 유지해야 할 정렬/순서 파라미터를 추가합니다.
      if (sort) newParams.set("sort", sort);
      if (order) newParams.set("order", order);

      // 필터가 변경되었으므로 페이지는 항상 1로 리셋합니다.
      newParams.set("page", "1");

      router.push(`/admin/records?${newParams.toString()}`);
    }, 500);

    return () => {
      clearTimeout(handler);
    };
    // ▼▼▼ 3. 의존성 배열에는 필터 상태값만 포함시킵니다. ▼▼▼
  }, [username, fromDate, toDate, category, router]);

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
        <Select
          onValueChange={setCategory}
          value={category} // defaultValue 대신 value 사용
        >
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
      {/* Filter 버튼은 이제 필요 없으므로 제거합니다. */}
    </div>
  );
}
