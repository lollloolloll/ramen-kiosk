import { getAllGeneralUsers, getAllAdminUsers } from "@/lib/actions/generalUser";
import { UsersPageClient } from "./UsersPageClient";

export default async function AdminUsersPage() {
  const generalUsersResult = await getAllGeneralUsers();
  const adminUsersResult = await getAllAdminUsers();

  const generalUsers = generalUsersResult.data || [];
  const adminUsers = adminUsersResult.data || [];

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">사용자 관리</h1>
      <UsersPageClient generalUsers={generalUsers} adminUsers={adminUsers} />
    </div>
  );
}
