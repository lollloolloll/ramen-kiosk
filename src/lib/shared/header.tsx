"use client";

import { Menu, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadDatabase } from "@/lib/actions/backup";

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const handleBackup = async () => {
    if (!confirm("현재 데이터베이스(DB)를 백업하시겠습니까?")) return;

    try {
      const result = await downloadDatabase();

      if (result.success && result.buffer) {
        const link = document.createElement("a");

        // MIME 타입과 Base64 데이터를 조합하여 href 설정
        link.href = `data:${result.mimeType};base64,${result.buffer}`;
        link.download = result.fileName || "backup.db";

        document.body.appendChild(link);
        link.click();

        // 뒷정리
        document.body.removeChild(link);
      } else {
        alert(`백업 실패: ${result.error}`);
      }
    } catch (error) {
      alert(
        `백업 중 오류 발생: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  };

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
      <Button
        variant="outline"
        size="icon"
        className="shrink-0 "
        onClick={onMenuClick}
      >
        <Home className="h-5 w-5" />
        <span className="sr-only">Toggle navigation menu</span>
      </Button>
      <Button
        variant="ghost"
        className="text-lg font-semibold cursor-pointer underline"
        asChild
      >
        <a
          href="https://github.com/lollloolloll/ramen-kiosk"
          target="_blank"
          rel="noopener noreferrer"
        >
          관리자메뉴얼
        </a>
      </Button>
      <div className="flex items-center gap-4 ml-auto">
        <Button variant="ghost" onClick={handleBackup}>
          백업
        </Button>
        <Button variant="ghost">마이페이지</Button>
        <Button variant="ghost">로그아웃</Button>
      </div>
    </header>
  );
}
