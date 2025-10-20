import { getRentalRecords } from "@/lib/actions/rental";
import { RecordsPageClient } from "./RecordsPageClient";

// 1. Props 인터페이스를 완전히 변경합니다.
//    `searchParams` 객체 대신, URL 파라미터와 동일한 이름의 속성을 직접 정의합니다.
interface RecordsPageProps {
  // `searchParams` 객체를 제거하고,
  // 예상되는 URL 파라미터를 직접 명시합니다.
  username?: string;
  from?: string;
  to?: string;
}

// 2. 함수 시그니처에서 `searchParams` 대신 개별 변수를 직접 받습니다.
//    Next.js는 URL의 ?username=...&from=... 등을 자동으로 이 props에 매핑해줍니다.
export default async function RecordsPage({
  username,
  from,
  to,
}: RecordsPageProps) {
  // 3. 이제 `searchParams`를 거치지 않고 바로 변수를 사용합니다.
  const filters = {
    userId: username,
    startDate: from ? new Date(from) : undefined,
    endDate: to ? new Date(to) : undefined,
  };

  const result = await getRentalRecords(filters);

  if (result.error || !result.data) {
    return <p>Error loading records.</p>;
  }

  const records = result.data as any;

  return <RecordsPageClient records={records} />;
}
