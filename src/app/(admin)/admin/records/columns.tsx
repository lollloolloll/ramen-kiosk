"use client";

import { ColumnDef } from "@tanstack/react-table";

export type RentalRecord = {
  id: number;
  rentalDate: Date | null;
  userName: string | null;
  itemName: string | null;
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
    accessorKey: "rentalDate",
    header: "Date",
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
