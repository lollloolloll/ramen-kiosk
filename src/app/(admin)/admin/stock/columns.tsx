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
import { ramens } from "@drizzle/schema";
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
    accessorKey: "imageUrl",
    header: "Image", // 헤더 텍스트를 더 간결하게 변경
    cell: ({ row }) => {
      // 현재 행(row)의 원본 데이터(original)에서 값을 가져옵니다.
      const imageUrl = row.original.imageUrl;
      const ramenName = row.original.name;

      // 이미지 URL이 존재하면 img 태그를, 없으면 대체 텍스트를 보여줍니다.
      return imageUrl ? (
        <img
          src={imageUrl}
          alt={`${ramenName} 이미지`}
          className="h-16 w-16 rounded-md object-cover mx-auto" // 이미지 크기와 스타일 지정, mx-auto로 중앙 정렬
        />
      ) : (
        <span className="text-muted-foreground">이미지 없음</span>
      );
    },
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
