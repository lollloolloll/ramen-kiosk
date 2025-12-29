import { getAllGeneralUsers } from "@/lib/actions/generalUser";
import { UsersPageClient } from "./UsersPageClient";
import { processAndMutateExpiredRentals } from "@/lib/actions/rental";
export const dynamic = "force-dynamic";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await processAndMutateExpiredRentals();

  const params = await searchParams;

  const page =
    Number(Array.isArray(params.page) ? params.page[0] : params.page) || 1;
  const per_page =
    Number(
      Array.isArray(params.per_page) ? params.per_page[0] : params.per_page
    ) || 10;
  const sort =
    (Array.isArray(params.sort) ? params.sort[0] : params.sort) || "name";
  const order =
    (Array.isArray(params.order) ? params.order[0] : params.order) || "asc";
  const search =
    (Array.isArray(params.search) ? params.search[0] : params.search) || "";

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
