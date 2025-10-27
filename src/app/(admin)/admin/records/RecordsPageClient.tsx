"use client";

import { DataTable } from "@/components/ui/data-table";
import { columns, RentalRecord } from "./columns";

interface RecordsPageClientProps {
  records: RentalRecord[];
}

export function RecordsPageClient({ records }: RecordsPageClientProps) {
  return (
    <DataTable columns={columns} data={records} />
  );
}
