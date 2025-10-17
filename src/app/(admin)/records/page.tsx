import { getRentalRecords } from "@/lib/actions/rental";
import { RecordsPageClient } from "./RecordsPageClient";

interface RecordsPageProps {
  searchParams: {
    username?: string;
    from?: string;
    to?: string;
  };
}

export default async function RecordsPage({ searchParams }: RecordsPageProps) {
  const filters = {
    userId: searchParams.username,
    startDate: searchParams.from ? new Date(searchParams.from) : undefined,
    endDate: searchParams.to ? new Date(searchParams.to) : undefined,
  };

  const result = await getRentalRecords(filters);

  if (result.error || !result.data) {
    return <p>Error loading records.</p>;
  }

  // Type assertion as the data from the server action will match
  const records = result.data as any;

  return <RecordsPageClient records={records} />;
}
