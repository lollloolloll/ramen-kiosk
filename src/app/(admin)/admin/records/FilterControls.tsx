"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
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

  const today = new Date();
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(today.getMonth() - 1);

  const [username, setUsername] = React.useState(
    searchParams.get("username") || ""
  );

  const [fromDate, setFromDate] = React.useState<Date | undefined>(
    searchParams.get("from") ? new Date(searchParams.get("from")!) : oneMonthAgo
  );
  const [toDate, setToDate] = React.useState<Date | undefined>(
    searchParams.get("to") ? new Date(searchParams.get("to")!) : today
  );
  const [category, setCategory] = React.useState(
    searchParams.get("category") || "all"
  );

  const handleFilter = () => {
    const params = new URLSearchParams();
    if (username) params.set("username", username);
    if (fromDate) params.set("from", fromDate.toISOString());
    if (toDate) params.set("to", toDate.toISOString());
    if (category && category !== "all") params.set("category", category);

    router.push(`/admin/records?${params.toString()}`);
  };

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
        <Select onValueChange={setCategory} defaultValue={category}>
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
      <Button onClick={handleFilter}>Filter</Button>
    </div>
  );
}
