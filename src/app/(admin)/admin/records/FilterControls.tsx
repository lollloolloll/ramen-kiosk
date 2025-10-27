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

  // URL을 업데이트하는 로직을 useEffect로 분리
  React.useEffect(() => {
    // 디바운싱: 사용자가 타이핑을 멈춘 후 500ms 뒤에 필터링을 적용합니다.
    const handler = setTimeout(() => {
      const params = new URLSearchParams(searchParams); // 기존 파라미터 유지

      // 값이 있으면 설정, 없으면 파라미터에서 제거
      if (username) {
        params.set("username", username);
      } else {
        params.delete("username");
      }

      if (fromDate) {
        params.set("from", fromDate.toISOString().split("T")[0]); // YYYY-MM-DD 형식
      } else {
        params.delete("from");
      }

      if (toDate) {
        params.set("to", toDate.toISOString().split("T")[0]);
      } else {
        params.delete("to");
      }

      if (category && category !== "all") {
        params.set("category", category);
      } else {
        params.delete("category");
      }

      // 필터 변경 시 항상 첫 페이지로 이동
      params.set("page", "1");

      // router.push는 클라이언트 사이드 네비게이션을 트리거합니다.
      // 페이지 전체가 아닌, 이 페이지 컴포넌트만 다시 렌더링됩니다.
      router.push(`/admin/records?${params.toString()}`);
    }, 500); // 500ms 딜레이

    // 컴포넌트가 언마운트되거나 의존성 배열의 값이 바뀌기 전에 타이머를 클리어합니다.
    return () => {
      clearTimeout(handler);
    };
  }, [username, fromDate, toDate, category, router, searchParams]); // 의존성 배열에 router와 searchParams 추가

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
