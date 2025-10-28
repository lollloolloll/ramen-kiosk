import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[oklch(0.75_0.12_165/0.15)] via-[oklch(0.7_0.18_350/0.15)] to-[oklch(0.7_0.18_350/0.15)]">
      {/* 배경 장식 요소 */}
      <div
        className="absolute top-10 left-10 text-6xl opacity-20 animate-bounce"
        style={{ animationDuration: "3s" }}
      >
        🎮
      </div>
      <div
        className="absolute bottom-20 right-16 text-5xl opacity-20 animate-bounce"
        style={{ animationDuration: "4s", animationDelay: "0.5s" }}
      >
        🎯
      </div>
      <div
        className="absolute top-1/3 right-10 text-4xl opacity-20 animate-bounce"
        style={{ animationDuration: "3.5s", animationDelay: "1s" }}
      >
        ⚽
      </div>

      {/* 관리자 페이지 링크 - 우측 상단 */}
      <Link
        href="/admin"
        className="absolute top-6 right-6 text-sm text-muted-foreground hover:text-[oklch(0.75_0.12_165)] transition-colors"
      >
        관리자
      </Link>

      {/* 메인 컨텐츠 */}
      <div className="relative z-10 text-center space-y-12 p-8">
        {/* 로고/제목 영역 */}
        <div className="space-y-4">
          <div
            className="text-8xl mb-6 animate-bounce"
            style={{ animationDuration: "2s" }}
          >
            🍜
          </div>
          <h1 className="text-7xl font-black text-[oklch(0.75_0.12_165)] tracking-tight">
            쉬다 대여
          </h1>
          <div className="h-2 w-40 mx-auto bg-gradient-to-r from-[oklch(0.75_0.12_165)] via-[oklch(0.7_0.18_350)] to-[oklch(0.7_0.18_350)] rounded-full" />
          <p className="text-2xl font-medium text-muted-foreground mt-6">
            원하는 물건을 편하게 대여하세요
          </p>
        </div>

        {/* 메인 버튼 */}
        <div className="pt-8">
          <Button
            asChild
            size="lg"
            className="h-20 px-16 text-2xl font-bold bg-gradient-to-r from-[oklch(0.75_0.12_165)] via-[oklch(0.7_0.18_350)] to-[oklch(0.7_0.18_350)] hover:from-[oklch(0.7_0.12_165)] hover:via-[oklch(0.65_0.18_350)] hover:to-[oklch(0.65_0.18_350)] transition-all duration-300 transform hover:scale-110 shadow-2xl rounded-2xl"
          >
            <Link href="/kiosk">🚀 대여 시작하기</Link>
          </Button>
        </div>

        {/* 안내 텍스트 */}
        <p className="text-sm text-muted-foreground animate-pulse">
          화면을 터치하여 시작하세요
        </p>
      </div>

      {/* 하단 장식 */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <div className="flex gap-2">
          <div className="w-2 h-2 rounded-full bg-[oklch(0.75_0.12_165)] animate-pulse" />
          <div
            className="w-2 h-2 rounded-full bg-[oklch(0.7_0.18_350)] animate-pulse"
            style={{ animationDelay: "0.3s" }}
          />
          <div
            className="w-2 h-2 rounded-full bg-[oklch(0.75_0.12_165)] animate-pulse"
            style={{ animationDelay: "0.6s" }}
          />
        </div>
      </div>
    </div>
  );
}
