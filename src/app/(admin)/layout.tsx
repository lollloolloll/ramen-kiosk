// src/app/(admin)/layout.tsx

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Middleware에서 인증을 처리하므로, 여기서는 자식 컴포넌트만 렌더링합니다.
  return <>{children}</>;
}