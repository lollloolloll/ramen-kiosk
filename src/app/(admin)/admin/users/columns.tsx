"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { ArrowUpDown } from "lucide-react";
import { generalUsers, users } from "@/lib/db/schema";
import { deleteGeneralUser, deleteAdminUser } from "@/lib/actions/generalUser";
import { toast } from "sonner";

type GeneralUser = typeof generalUsers.$inferSelect;
type AdminUser = typeof users.$inferSelect;

const handleDeleteGeneralUser = async (id: number) => {
  const result = await deleteGeneralUser(id);
  if (result.success) {
    toast.success("사용자가 삭제되었습니다.");
  } else {
    toast.error(result.error);
  }
};

const handleDeleteAdminUser = async (id: number) => {
  const result = await deleteAdminUser(id);
  if (result.success) {
    toast.success("관리자가 삭제되었습니다.");
  } else {
    toast.error(result.error);
  }
};

export const generalUserColumns: ColumnDef<GeneralUser>[] = [
  {
    accessorKey: "id",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          ID
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
  },
  {
    accessorKey: "name",
    header: "이름",
  },
  {
    accessorKey: "phoneNumber",
    header: "전화번호",
  },
  {
    accessorKey: "gender",
    header: "성별",
  },
  {
    accessorKey: "age",
    header: "나이",
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const user = row.original;
      return (
        <Button variant="destructive" onClick={() => handleDeleteGeneralUser(user.id)}>
          삭제
        </Button>
      );
    },
  },
];

export const adminUserColumns: ColumnDef<AdminUser>[] = [
  {
    accessorKey: "id",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          ID
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
  },
  {
    accessorKey: "username",
    header: "사용자 이름",
  },
  {
    accessorKey: "role",
    header: "역할",
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const user = row.original;
      return (
        <Button variant="destructive" onClick={() => handleDeleteAdminUser(user.id)}>
          삭제
        </Button>
      );
    },
  },
];
