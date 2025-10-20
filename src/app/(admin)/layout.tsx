// src/app/(admin)/layout.tsx

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
// 중요: 아래 authOptions는 v4 스타일로 설정된 route.ts 파일에서 가져와야 합니다.
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1. getServerSession 함수를 호출하여 세션 정보를 가져옵니다.
  //    반드시 authOptions를 인자로 전달해야 합니다.
  const session = await getServerSession(authOptions);

  // 2. 세션 존재 여부 및 사용자 역할(role)을 확인합니다.
  if (!session || session.user?.role !== "ADMIN") {
    // 조건에 맞지 않으면 메인 페이지로 리디렉션합니다.
    redirect("/");
  }

  // 조건을 통과한 경우에만 자식 컴포넌트를 렌더링합니다.
  return <>{children}</>;
}
