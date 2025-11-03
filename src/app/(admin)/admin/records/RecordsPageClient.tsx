"use client";

import { useState, useEffect } from "react";
import { DataTable } from "@/components/ui/data-table";
import { columns, RentalRecord } from "./columns";
import { Pagination } from "@/lib/shared/pagination";
import { Dialog } from "@/components/ui/dialog";
import { RentalHistoryForm } from "@/lib/shared/rentalHistoryForm";
import { getAllItemNames } from "@/lib/actions/rental";

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
  const [availableItems, setAvailableItems] = useState<string[]>([]);

  useEffect(() => {
    async function fetchItemNames() {
      const result = await getAllItemNames();
      if (result.success && result.data) {
        setAvailableItems(result.data);
      } else {
        console.error("Failed to fetch item names:", result.error);
      }
    }
    fetchItemNames();
  }, []);

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
          <RentalHistoryForm
            userId={selectedUserForHistory.userId}
            username={selectedUserForHistory.username}
            availableItems={availableItems}
          />
        </Dialog>
      )}
    </div>
  );
}
