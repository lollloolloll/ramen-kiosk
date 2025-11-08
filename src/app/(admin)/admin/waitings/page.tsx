import { db } from "@/lib/db";
import { WaitingPageClient } from "./WaitingPageClient";
import { getWaitingQueueEntries } from "@/lib/actions/rental"; // 이 액션은 나중에 구현합니다.

interface WaitingPageProps {
  searchParams: {
    page?: string;
    per_page?: string;
  };
}

export default async function WaitingPage({ searchParams }: WaitingPageProps) {
  const page = parseInt(searchParams.page || "1");
  const per_page = parseInt(searchParams.per_page || "10");

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
