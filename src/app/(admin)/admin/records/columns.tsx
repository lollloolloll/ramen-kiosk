"use client";

import { ColumnDef } from "@tanstack/react-table";

export type RentalRecord = {
  id: number;
  userId: number; // Added userId
  userPhone: string | null;
  rentalDate: Date | null;
  userName: string | null;
  itemName: string | null;
  maleCount: number | null;
  femaleCount: number | null;
};

export const columns: ColumnDef<RentalRecord>[] = [
  {
    accessorKey: "id",
    header: "ID",
  },
  {
    accessorKey: "userName",
    header: "User",
  },
  {
    accessorKey: "itemName",
    header: "Item",
  },
  {
    header: "대여인원",
    cell: ({ row }) => {
      const maleCount = row.original.maleCount ?? 0;
      const femaleCount = row.original.femaleCount ?? 0;
      return `남: ${maleCount}, 여: ${femaleCount}`;
    },
  },
  {
    accessorKey: "rentalDate",
    header: "Date",
    size: 180, // Adjust this value as needed
    cell: ({ row }) => {
      const timestampInSeconds = row.getValue("rentalDate") as number;

      if (!timestampInSeconds || typeof timestampInSeconds !== "number") {
        return <span>-</span>;
      }

      const date = new Date(timestampInSeconds * 1000);
      return <div>{date.toLocaleString("ko-KR")}</div>;
    },
  },
];
