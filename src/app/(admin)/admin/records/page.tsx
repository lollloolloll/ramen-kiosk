import { Suspense } from "react";
import { getRentalRecords } from "@/lib/actions/rental";
import { RecordsPageClient } from "./RecordsPageClient";
import { FilterControls } from "./FilterControls";
import { getDistinctItemNames } from "@/lib/actions/item";

export const dynamic = "force-dynamic";

interface RecordsPageProps {
  searchParams: Promise<{
    search?: string;
    from?: string;
    to?: string;
    category?: string;
    item?: string;
    page?: string;
    per_page?: string;
    sort?: string;
    order?: string;
  }>;
}

export default async function RecordsPage({ searchParams }: RecordsPageProps) {
  const params = await searchParams;
  const { search, from, to, category, item } = params;
  const page = Number(params.page) || 1;
  const per_page = Number(params.per_page) || 10;
  const sort = params.sort || "rentalDate";
  const order = params.order || "desc";

  const filters = {
    search,
    startDate: from,
    endDate: to,
    itemName: item,
    page,
    per_page,
    sort,
    order,
  };

  const [rentalResult, itemNamesResult] = await Promise.all([
    getRentalRecords(filters),
    getDistinctItemNames(),
  ]);

  if (!rentalResult || !itemNamesResult) {
    return <p>Error: Could not retrieve data results.</p>;
  }

  if (rentalResult.error || !rentalResult.data) {
    return <p>Error loading records.</p>;
  }

  if (itemNamesResult.error || !itemNamesResult.data) {
    return <p>Error loading items.</p>;
  }

  const records = rentalResult.data as any;
  const total_count = rentalResult.total_count || 0;
  const itemNames = itemNamesResult.data;

  // console.log("records===", records);
  return (
    <div className="py-10 px-16">
      <h1 className="text-3xl font-bold mb-6">대여 기록</h1>
      <FilterControls items={itemNames} sort={sort} order={order} />
      <Suspense fallback={<div>Loading records...</div>}>
        <RecordsPageClient
          records={records}
          page={page}
          per_page={per_page}
          total_count={total_count}
          sort={sort}
          order={order}
        />
      </Suspense>
    </div>
  );
}
