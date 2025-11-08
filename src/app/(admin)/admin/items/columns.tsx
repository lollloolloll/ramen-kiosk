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
import { items } from "@drizzle/schema";
import { EditItemForm } from "./EditItemForm";
import { DeleteItemDialog } from "./DeleteItemDialog";
import { Switch } from "@/components/ui/switch";
import { toggleItemVisibility, toggleItemDeletedStatus } from "@/lib/actions/item";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type Item = typeof items.$inferSelect;

export const columns: ColumnDef<Item>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => {
      const item = row.original;
      return (
        <span className={cn({ "text-muted-foreground": item.isDeleted })}>
          {item.name}
        </span>
      );
    },
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => {
      const item = row.original;
      return (
        <span className={cn({ "text-muted-foreground": item.isDeleted })}>
          {item.category}
        </span>
      );
    },
  },
  {
    accessorKey: "imageUrl",
    header: "Image", // 헤더 텍스트를 더 간결하게 변경
    cell: ({ row }) => {
      // 현재 행(row)의 원본 데이터(original)에서 값을 가져옵니다.
      const imageUrl = row.original.imageUrl;
      const itemName = row.original.name;

      // 이미지 URL이 존재하면 img 태그를, 없으면 대체 텍스트를 보여줍니다.
      return imageUrl ? (
        <img
          src={imageUrl}
          alt={`${itemName} 이미지`}
          className="h-16 w-16 rounded-md object-cover mx-auto" // 이미지 크기와 스타일 지정, mx-auto로 중앙 정렬
        />
      ) : (
        <span className="text-muted-foreground">이미지 없음</span>
      );
    },
  },
  {
    accessorKey: "isHidden",
    header: "Hidden",
    cell: ({ row }) => {
      const item = row.original;
      const isChecked = !item.isHidden; // isHidden이 true면 체크 해제 (숨김), false면 체크 (표시)

      const handleToggle = async (newCheckedState: boolean) => {
        const newIsHidden = !newCheckedState; // Switch의 checked 상태와 isHidden은 반대
        const result = await toggleItemVisibility(item.id, newIsHidden);
        if (result.success) {
          toast.success("아이템 숨김처리 업데이트.");
        } else {
          toast.error(result.error || "아이템 숨김처리 업데이트 실패");
        }
      };

      return <Switch checked={isChecked} onCheckedChange={handleToggle} />;
    },
  },
  {
    accessorKey: "isTimeLimited",
    header: "대여 제한 여부",
    cell: ({ row }) => {
      const isTimeLimited = row.original.isTimeLimited;
      return <span>{isTimeLimited ? "예" : "아니오"}</span>;
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const item = row.original;

      const handleToggleDelete = async () => {
        const result = await toggleItemDeletedStatus(item.id, !item.isDeleted);
        if (result.success) {
          toast.success(
            `아이템이 성공적으로 ${item.isDeleted ? "복구" : "삭제"}되었습니다.`
          );
        } else {
          toast.error(result.error || "작업에 실패했습니다.");
        }
      };

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
              onClick={() => navigator.clipboard.writeText(String(item.id))}
            >
              Copy Item ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <EditItemForm item={item}>
              <DropdownMenuItem
                onSelect={(e) => e.preventDefault()}
                disabled={item.isDeleted}
              >
                Edit
              </DropdownMenuItem>
            </EditItemForm>
            <DropdownMenuItem
              onClick={handleToggleDelete}
              className={cn({
                "text-red-500": !item.isDeleted,
                "text-green-500": item.isDeleted,
              })}
            >
              {item.isDeleted ? "Restore" : "Delete"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
