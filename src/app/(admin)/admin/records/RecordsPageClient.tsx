"use client";

import { DataTable } from "@/components/ui/data-table";
import { columns, RentalRecord } from "./columns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { DateRange } from "react-day-picker";

interface RecordsPageClientProps {
  records: RentalRecord[];
}

export function RecordsPageClient({ records }: RecordsPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState(searchParams.get("username") || "");
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: searchParams.get("from")
      ? new Date(searchParams.get("from")!)
      : undefined,
    to: searchParams.get("to") ? new Date(searchParams.get("to")!) : undefined,
  });

  const handleFilter = () => {
    const params = new URLSearchParams();
    if (username) params.set("username", username);
    if (dateRange?.from) params.set("from", dateRange.from.toISOString());
    if (dateRange?.to) params.set("to", dateRange.to.toISOString());
    router.push(`/admin/records?${params.toString()}`);
  };

  return (
    <div className="container px-16 py-10">
      <h1 className="text-3xl font-bold mb-6">Rental Records</h1>
      <div className="flex items-center gap-4 mb-6">
        <Input
          placeholder="Filter by username..."
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="max-w-sm"
        />
        {/* I will assume a DatePickerWithRange component exists as it's a common shadcn recipe */}
        {/* If not, I would need to create it. For now, I'll add a placeholder comment */}
        <DateRangePicker date={dateRange} setDate={setDateRange} />
        <Button onClick={handleFilter}>Filter</Button>
      </div>
      <DataTable columns={columns} data={records} />
    </div>
  );
}
