"use client";

import { useState, useEffect } from "react";
import { DataTable } from "@/components/ui/data-table";
import { columns, RentalRecord } from "./columns";
import { Pagination } from "@/lib/shared/pagination";
import { Dialog } from "@/components/ui/dialog";
import { UserInfoForm } from "@/lib/shared/userInfoForm";

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
  const [isRentalHistoryDialogOpen, setIsRentalHistoryDialogOpen] =
    useState(false);
  const [selectedUserForHistory, setSelectedUserForHistory] = useState<{
    userId: number;
    username: string;
  } | null>(null);

  const handleRowClick = (record: RentalRecord) => {
    if (record.userId && record.userName) {
      setSelectedUserForHistory({
        userId: record.userId,
        username: record.userName,
      });
      setIsRentalHistoryDialogOpen(true);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <DataTable columns={columns} data={records} onRowClick={handleRowClick} />
      </div>

      <Pagination page={page} per_page={per_page} total_count={total_count} />

      {selectedUserForHistory && (
        <Dialog
          open={isRentalHistoryDialogOpen}
          onOpenChange={setIsRentalHistoryDialogOpen}
        >
          <UserInfoForm
            userId={selectedUserForHistory.userId}
            username={selectedUserForHistory.username}
          />
        </Dialog>
      )}
    </div>
  );
}
