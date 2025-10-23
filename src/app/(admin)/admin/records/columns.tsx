"use client";

import { ColumnDef } from "@tanstack/react-table";

export type RentalRecord = {
  id: number;
  rentalDate: Date | null;
  userName: string | null;
  ramenName: string | null;
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
    accessorKey: "ramenName",
    header: "Ramen",
  },
  {
    accessorKey: "rentalDate",
    header: "Date",
    cell: ({ row }) => {
      const date = row.getValue("rentalDate") as Date;
      return <span>{date ? new Date(date).toLocaleString() : "N/A"}</span>;
    },
  },
];
