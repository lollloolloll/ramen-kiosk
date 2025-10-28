"use client";

import { ColumnDef } from "@tanstack/react-table";

export type RentalRecord = {
  id: number;
  rentalDate: Date | null;
  userName: string | null;
  itemName: string | null;
  peopleCount: number | null;
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
    accessorKey: "peopleCount",
    header: "대여인원",
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
