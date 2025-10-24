"use client";

import { generalUsers } from "@drizzle/schema";
import { DataTable } from "@/components/ui/data-table";
import { generalUserColumns } from "./columns";

type GeneralUser = typeof generalUsers.$inferSelect;

interface UsersPageClientProps {
  generalUsers: GeneralUser[];
}

export function UsersPageClient({ generalUsers }: UsersPageClientProps) {
  return (
    <div>
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">일반 사용자</h2>
        <DataTable columns={generalUserColumns} data={generalUsers} />
      </div>
    </div>
  );
}
