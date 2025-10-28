"use client";

import { useState, useEffect } from "react";
import { getRentalRecordsByUserId } from "@/lib/actions/rental";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// ✅ Updated type to match the actual return from getRentalRecordsByUserId
type RentalRecord = {
  id: number;
  rentalDate: number;
  userName: string | null;
  itemName: string | null;
  itemCategory: string | null;
  peopleCount: number;
  imageUrl: string | null; // Added imageUrl
  // Removed userId as it's not returned by the query
};

interface RentalHistoryFormProps {
  userId: number;
  username: string;
}

export const rentalHistoryColumns: ColumnDef<RentalRecord>[] = [
  {
    accessorKey: "itemName",
    header: "대여 물품",
  },
  {
    accessorKey: "rentalDate",
    header: "대여일",
    cell: ({ row }) => {
      const date = row.getValue("rentalDate");
      return date
        ? new Date((date as number) * 1000).toLocaleString("ko-KR")
        : "";
    },
  },
  {
    accessorKey: "peopleCount",
    header: "대여인원",
  },
];

export function RentalHistoryForm({
  userId,
  username,
}: RentalHistoryFormProps) {
  const [records, setRecords] = useState<RentalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(5);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    async function fetchRentalHistory() {
      setLoading(true);
      const result = await getRentalRecordsByUserId(userId, {
        page,
        per_page: perPage,
      });
      if (result.error || !result.data) {
        setError(result.error || "대여 기록을 불러오는데 실패했습니다.");
        setRecords([]);
        setTotalCount(0);
      } else {
        // ✅ No type casting needed now - types match perfectly
        setRecords(result.data);
        setTotalCount(result.total_count || 0);
        setError(null);
      }
      setLoading(false);
    }

    if (username) {
      fetchRentalHistory();
    }
  }, [userId, username, page, perPage]); // ✅ Added userId to dependencies

  const totalPages = Math.ceil(totalCount / perPage);

  return (
    <DialogContent className="sm:max-w-[800px]">
      <DialogHeader>
        <DialogTitle>{username}님의 대여 기록</DialogTitle>
      </DialogHeader>
      <div>
        {loading ? (
          <p>로딩 중...</p>
        ) : error ? (
          <p>오류: {error}</p>
        ) : records.length === 0 ? (
          <p className="text-center py-8">대여 기록이 없습니다.</p>
        ) : (
          <>
            <DataTable columns={rentalHistoryColumns} data={records} />
            <div className="flex items-center justify-end space-x-2 py-4">
              <span className="text-sm text-muted-foreground">
                총 {totalCount}개 중 {records.length}개
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                이전
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || totalPages === 0}
              >
                다음
              </Button>
            </div>
          </>
        )}
      </div>
    </DialogContent>
  );
}
