"use client";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash2 } from "lucide-react";
import { deleteAdmin } from "@/lib/actions/admin";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

interface AdminUser {
  id: number;
  username: string;
  role: string;
}

interface AdminListClientProps {
  admins: AdminUser[];
}

export default function AdminListClient({ admins }: AdminListClientProps) {
  const router = useRouter();
  const { data: session } = useSession();

  // 현재 로그인한 사용자의 ID 추출
  // next-auth 타입 설정에 따라 (session.user as any).id 처리가 필요할 수 있음
  const currentUserId = session?.user ? Number((session.user as any).id) : null;

  const handleDelete = async (id: number) => {
    if (!confirm("정말 이 관리자 계정을 삭제하시겠습니까?")) return;

    const result = await deleteAdmin(id);
    if (result.success) {
      toast.success("관리자가 삭제되었습니다.");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px]">ID</TableHead>
            <TableHead>아이디 (Username)</TableHead>
            <TableHead>권한</TableHead>
            <TableHead className="text-right">관리</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {admins.map((admin) => (
            <TableRow key={admin.id}>
              <TableCell>{admin.id}</TableCell>
              <TableCell className="font-medium">{admin.username}</TableCell>
              <TableCell>{admin.role}</TableCell>
              <TableCell className="text-right">
                {/* 본인 계정이면 '나' 표시, 아니면 삭제 버튼 표시 */}
                {currentUserId === admin.id ? (
                  <span className="text-xs text-muted-foreground px-3 font-bold">
                    나 (삭제불가)
                  </span>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleDelete(admin.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
          {admins.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center">
                등록된 관리자가 없습니다.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
