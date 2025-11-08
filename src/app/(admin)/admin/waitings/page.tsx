import { db } from "@/lib/db";
import { WaitingPageClient } from "./WaitingPageClient";
import { getWaitingQueueEntries } from "@/lib/actions/rental";

export default async function WaitingPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string; per_page?: string }>;
}) {
  // searchParams를 await로 받습니다
  const params = await searchParams;
  const page = parseInt(params?.page || "1");
  const per_page = parseInt(params?.per_page || "10");

  const { data: waitingEntries, total_count } = await getWaitingQueueEntries({
    page,
    per_page,
  });

  return (
    <WaitingPageClient
      waitingEntries={waitingEntries || []}
      page={page}
      per_page={per_page}
      total_count={total_count || 0}
    />
  );
}
