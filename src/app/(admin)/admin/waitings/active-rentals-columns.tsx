"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { extendRentalTime, returnItem } from "@/lib/actions/rental";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// This type is inferred from the return type of getActiveRentalsWithWaitCount
export type ActiveRental = {
  recordId: number;
  itemName: string | null;
  userName: string | null;
  rentalDate: number | null;
  returnDueDate: number | null;
  waitCount: number;
  itemsId: number | null;
};

export const activeRentalsColumns: ColumnDef<ActiveRental>[] = [
  {
    accessorKey: "recordId",
    header: "대여 ID",
  },
  {
    accessorKey: "itemName",
    header: "아이템",
  },
  {
    accessorKey: "userName",
    header: "사용자",
  },
  {
    accessorKey: "rentalDate",
    header: "대여 시작",
    cell: ({ row }) => {
      const timestamp = row.original.rentalDate;
      if (!timestamp) return "-";
      return new Date(timestamp * 1000).toLocaleString("ko-KR");
    },
  },
  {
    accessorKey: "returnDueDate",
    header: "반납 예정",
    cell: ({ row }) => {
      const timestamp = row.original.returnDueDate;
      if (!timestamp) return "-";
      const date = new Date(timestamp * 1000);
      const isPast = date < new Date();
      return (
        <span className={isPast ? "text-red-500 font-bold" : ""}>
          {date.toLocaleString("ko-KR")}
        </span>
      );
    },
  },
  {
    accessorKey: "waitCount",
    header: "대기자 수",
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const rental = row.original;
      const router = useRouter();

      const handleReturn = async () => {
        const result = await returnItem(rental.recordId);
        if (result.success) {
          toast.success("아이템이 반납 처리되었습니다.");
          router.refresh();
        } else {
          toast.error(result.error || "아이템 반납 처리에 실패했습니다.");
        }
      };

      const handleExtend = async () => {
        const result = await extendRentalTime(rental.recordId);
        if (result.success) {
          toast.success("대여 시간이 연장되었습니다.");
          router.refresh();
        } else {
          toast.error(result.error || "대여 시간 연장에 실패했습니다.");
        }
      };

      return (
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">메뉴 열기</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>관리</DropdownMenuLabel>
            <DropdownMenuItem onClick={handleReturn} className="text-red-500">
              즉시 반납 처리
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleExtend}
              disabled={rental.waitCount > 0}
            >
              연장하기
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() =>
                navigator.clipboard.writeText(String(rental.recordId))
              }
            >
              대여 ID 복사
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
