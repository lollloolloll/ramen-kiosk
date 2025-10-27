"use client";

import { DataTable } from "@/components/ui/data-table";
import { columns, RentalRecord } from "./columns";
import { Pagination } from "@/lib/shared/pagination";

interface RecordsPageClientProps {
  records: RentalRecord[];
  page: number;
  per_page: number;
  total_count: number;
  sort: string;
  order: string;
}

export function RecordsPageClient({
  records,
  page,
  per_page,
  total_count,
  sort,
  order,
}: RecordsPageClientProps) {
  return (
    <div>
      <div className="mb-8">
        <DataTable columns={columns} data={records} />
      </div>

      <Pagination page={page} per_page={per_page} total_count={total_count} />
    </div>
  );
}
