import { getAllGeneralUsers } from "@/lib/actions/generalUser";
import { UsersPageClient } from "./UsersPageClient";

export default async function AdminUsersPage() {
  const generalUsersResult = await getAllGeneralUsers();

  const generalUsers = generalUsersResult.data || [];

  return (
    <div className="container px-16 py-10">
      <h1 className="text-3xl font-bold mb-4">사용자 관리</h1>
      <UsersPageClient generalUsers={generalUsers} />
    </div>
  );
}
