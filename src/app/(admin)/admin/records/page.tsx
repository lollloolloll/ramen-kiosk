import { Suspense } from "react";
import { getRentalRecords } from "@/lib/actions/rental";
import { getDistinctCategories } from "@/lib/actions/item";
import { RecordsPageClient } from "./RecordsPageClient";
import { FilterControls } from "./FilterControls";

interface RecordsPageProps {
  searchParams: {
    username?: string;
    from?: string;
    to?: string;
    category?: string;
    page?: string;
    per_page?: string;
    sort?: string;
    order?: string;
  };
}

export default async function RecordsPage({ searchParams }: RecordsPageProps) {
  const { username, from, to, category } = searchParams;
  const page = Number(searchParams.page) || 1;
  const per_page = Number(searchParams.per_page) || 10;
  const sort = searchParams.sort || 'rentalDate';
  const order = searchParams.order || 'desc';

  const filters = {
    username,
    startDate: from ? new Date(from) : undefined,
    endDate: to ? new Date(to) : undefined,
    category: category,
    page,
    per_page,
    sort,
    order,
  };

  const [rentalResult, categoryResult] = await Promise.all([
    getRentalRecords(filters),
    getDistinctCategories(),
  ]);

  if (rentalResult.error || !rentalResult.data) {
    return <p>Error loading records.</p>;
  }

  if (categoryResult.error || !categoryResult.data) {
    return <p>Error loading categories.</p>;
  }

  const records = rentalResult.data as any;
  const total_count = rentalResult.total_count || 0;
  const categories = categoryResult.data;

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">대여 기록</h1>
      <FilterControls categories={categories} />
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
