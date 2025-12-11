import { getAdminList } from "@/lib/actions/admin";
import AdminListClient from "./AdminListClient";

export const dynamic = "force-dynamic";

export default async function AdminAccountPage() {
  // 1. 단순화된 리스트 조회 함수 호출
  const admins = await getAdminList();

  return (
    <div className="container max-w-4xl py-10 px-6">
      <div className="flex flex-col gap-2 mb-8">
        <h1 className="text-3xl font-bold">관리자 계정 관리</h1>
        <p className="text-muted-foreground">
          등록된 관리자 목록입니다. 본인 계정은 삭제할 수 없습니다.
        </p>
      </div>

      {/* 클라이언트 컴포넌트에 데이터 전달 */}
      <AdminListClient admins={admins} />
    </div>
  );
}
