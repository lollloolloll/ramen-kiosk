import { getWaitingQueueEntries } from "@/lib/actions/waiting";
import { getActiveRentalsWithWaitCount } from "@/lib/actions/rental";
import { WaitingPageClient } from "./WaitingPageClient";

export const dynamic = "force-dynamic";

interface WaitingPageProps {
  params?: Promise<{ [key: string]: string | string[] }>;
  searchParams?: Promise<{ page?: string; per_page?: string }>;
}

export default async function WaitingPage({ searchParams }: WaitingPageProps) {
  const params = await searchParams;
  const page = parseInt(
    Array.isArray(params?.page) ? params?.page[0] : params?.page || "1"
  );
  const per_page = parseInt(
    Array.isArray(params?.per_page)
      ? params?.per_page[0]
      : params?.per_page || "10"
  );

  const [waitingResult, activeRentalsResult] = await Promise.all([
    getWaitingQueueEntries({ page, per_page }),
    getActiveRentalsWithWaitCount(),
  ]);

  const { data: waitingEntries, total_count } = waitingResult;
  const { data: activeRentals } = activeRentalsResult;

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-8">대기열 아이템 관제탑</h1>
      <WaitingPageClient
        activeRentals={activeRentals || []}
        waitingEntries={waitingEntries || []}
        page={page}
        per_page={per_page}
        total_count={total_count || 0}
      />
    </div>
  );
}
