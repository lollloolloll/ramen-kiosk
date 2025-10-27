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
  };
}

export default async function RecordsPage({ searchParams }: RecordsPageProps) {
  const { username, from, to, category } = searchParams;

  const filters = {
    username,
    startDate: from ? new Date(from) : undefined,
    endDate: to ? new Date(to) : undefined,
    category: category,
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
  const categories = categoryResult.data;

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">대여 기록</h1>
      <FilterControls categories={categories} />
      <Suspense fallback={<div>Loading records...</div>}>
        <RecordsPageClient records={records} />
      </Suspense>
    </div>
  );
}
