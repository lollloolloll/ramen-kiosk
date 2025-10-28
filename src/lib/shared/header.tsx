"use client";

import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "next-auth/react";
import { Home } from "lucide-react";
interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
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
        <Button variant="ghost">마이페이지</Button>
        <Button variant="ghost">로그아웃</Button>
      </div>
    </header>
  );
}
