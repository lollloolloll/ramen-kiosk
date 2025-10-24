"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { ArrowUpDown } from "lucide-react";
import { generalUsers, users } from "@drizzle/schema";
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
    header: "ID",
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
    accessorKey: "birthDate",
    header: "생년월일",
  },
  {
    accessorKey: "school",
    header: "학교",
  },
  {
    accessorKey: "personalInfoConsent",
    header: "개인정보동의",
    cell: ({ row }) => {
      const consent = row.getValue("personalInfoConsent");
      return consent ? "동의" : "비동의";
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const user = row.original;
      return (
        <Button
          variant="destructive"
          onClick={() => handleDeleteGeneralUser(user.id)}
        >
          삭제
        </Button>
      );
    },
  },
];

export const adminUserColumns: ColumnDef<AdminUser>[] = [
  {
    accessorKey: "id",
    header: "ID",
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
        <Button
          variant="destructive"
          onClick={() => handleDeleteAdminUser(user.id)}
        >
          삭제
        </Button>
      );
    },
  },
];
