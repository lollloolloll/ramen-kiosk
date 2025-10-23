"use client";

import { generalUsers, users } from "@/lib/db/schema";
import { DataTable } from "@/components/ui/data-table";
import { generalUserColumns, adminUserColumns } from "./columns";

type GeneralUser = typeof generalUsers.$inferSelect;
type AdminUser = typeof users.$inferSelect;

interface UsersPageClientProps {
  generalUsers: GeneralUser[];
  adminUsers: AdminUser[];
}

export function UsersPageClient({ generalUsers, adminUsers }: UsersPageClientProps) {
  return (
    <div>
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">일반 사용자</h2>
        <DataTable columns={generalUserColumns} data={generalUsers} />
      </div>
      <div>
        <h2 className="text-xl font-semibold mb-2">관리자</h2>
        <DataTable columns={adminUserColumns} data={adminUsers} />
      </div>
    </div>
  );
}
