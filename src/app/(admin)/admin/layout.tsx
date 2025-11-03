"use client";

import { useState } from "react";
import { Header } from "@/lib/shared/header";
import { Sidebar } from "@/lib/shared/sidebar";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();

  const goMain = () => {
    router.push("/");
  };

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      {/* Desktop Sidebar */}
      <aside className="hidden border-r bg-muted/40 md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
            <a
              href="/admin"
              className="flex items-center gap-2 font-semibold px-16"
            >
              <span>Item Kiosk</span>
            </a>
          </div>
          <div className="flex-1">
            <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
              <Sidebar />
            </nav>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 flex h-full max-h-screen w-[220px] transform flex-col border-r bg-background transition-transform duration-300 ease-in-out md:hidden ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-14 items-center justify-between border-b px-4 lg:h-[60px] lg:px-6">
          <a
            href="/admin"
            className="flex items-center gap-2 font-semibold px-2"
          >
            <span>Item Kiosk</span>
          </a>
          <Button variant="ghost" size="icon">
            <X className="h-6 w-6" />
          </Button>
        </div>
        <div className="flex-1">
          <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
            <Sidebar />
          </nav>
        </div>
      </div>

      <div className="flex flex-col">
        <Header onMenuClick={goMain} />
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
