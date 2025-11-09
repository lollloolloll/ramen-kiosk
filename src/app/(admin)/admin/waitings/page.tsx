import { getWaitingQueueEntries } from "@/lib/actions/waiting";
import { getActiveRentalsWithWaitCount } from "@/lib/actions/rental";
import { WaitingPageClient } from "./WaitingPageClient";

export default async function WaitingPage({
  searchParams,
}: {
  searchParams?: { page?: string; per_page?: string };
}) {
  const page = parseInt(searchParams?.page || "1");
  const per_page = parseInt(searchParams?.per_page || "10");

  const [waitingResult, activeRentalsResult] = await Promise.all([
    getWaitingQueueEntries({ page, per_page }),
    getActiveRentalsWithWaitCount(),
  ]);

  const { data: waitingEntries, total_count } = waitingResult;
  const { data: activeRentals } = activeRentalsResult;

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-8">특수 아이템 관제탑</h1>
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
