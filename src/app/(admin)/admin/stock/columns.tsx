"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { ramens } from "@/lib/db/schema";
import { EditRamenForm } from "./EditRamenForm";
import { DeleteRamenDialog } from "./DeleteRamenDialog";

export type Ramen = typeof ramens.$inferSelect;

export const columns: ColumnDef<Ramen>[] = [
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "manufacturer",
    header: "Manufacturer",
  },
  {
    accessorKey: "stock",
    header: "Stock",
  },
  {
    accessorKey: "image_url",
    header: "Image URL",
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const ramen = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(String(ramen.id))}
            >
              Copy Ramen ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <EditRamenForm ramen={ramen}>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                Edit
              </DropdownMenuItem>
            </EditRamenForm>
            <DeleteRamenDialog ramenId={ramen.id}>
              <DropdownMenuItem
                onSelect={(e) => e.preventDefault()}
                className="text-red-500"
              >
                Delete
              </DropdownMenuItem>
            </DeleteRamenDialog>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
