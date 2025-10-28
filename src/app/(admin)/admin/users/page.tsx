import { getAllGeneralUsers } from "@/lib/actions/generalUser";
import { UsersPageClient } from "./UsersPageClient";

interface AdminUsersPageProps {
  searchParams: {
    page?: string;
    per_page?: string;
    sort?: string;
    order?: string;
    search?: string;
  };
}

export default async function AdminUsersPage({
  searchParams,
}: AdminUsersPageProps) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const per_page = Number(params.per_page) || 10;
  const sort = params.sort || "name"; // Default sort to 'name'
  const order = params.order || "asc"; // Default order to 'asc'
  const search = params.search || "";

  const generalUsersResult = await getAllGeneralUsers({
    page,
    per_page,
    sort,
    order,
    search,
  });

  const generalUsers = generalUsersResult.data || [];
  const total_count = generalUsersResult.total_count || 0;

  return (
    <div className="container px-16 py-10">
      <h1 className="text-3xl font-bold mb-4">사용자 관리</h1>
      <UsersPageClient
        generalUsers={generalUsers}
        page={page}
        per_page={per_page}
        total_count={total_count}
        sort={sort}
        order={order}
        search={search}
      />
    </div>
  );
}
