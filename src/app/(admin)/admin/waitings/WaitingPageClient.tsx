"use client";

import { DataTable } from "@/components/ui/data-table";
import { columns, WaitingEntry } from "./columns";
import { Pagination } from "@/lib/shared/pagination";

interface WaitingPageClientProps {
  waitingEntries: WaitingEntry[];
  page: number;
  per_page: number;
  total_count: number;
}

export function WaitingPageClient({
  waitingEntries,
  page,
  per_page,
  total_count,
}: WaitingPageClientProps) {
  return (
    <div>
      <div className="mb-8">
        <DataTable columns={columns} data={waitingEntries} />
      </div>
      <Pagination page={page} per_page={per_page} total_count={total_count} />
    </div>
  );
}
