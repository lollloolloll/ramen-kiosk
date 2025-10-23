import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="text-center space-y-4 p-4">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
          라면 키오스크 입니다다
        </h1>
        <p className="max-w-2xl mx-auto text-lg text-gray-500 md:text-xl dark:text-gray-400">
          셀프대여 서비스
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-4 mt-8">
        <Button asChild size="lg">
          <Link href="/kiosk">라면 대여하기</Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/admin">관리자 페이지</Link>
        </Button>
      </div>
    </div>
  );
}
