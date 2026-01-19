"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Home, ChevronLeft, ChevronRight } from "lucide-react"; // 아이콘 추가
import { ItemCard } from "@/components/item/ItemCard";
import { Item } from "@/app/(admin)/admin/items/columns";
import { RentalDialog } from "@/components/item/RentalDialog";
import { PromotionSlider } from "@/components/PromotionSlider";
import { processAndMutateExpiredRentals } from "@/lib/actions/rental";
import { cn } from "@/lib/utils";

interface KioskPageClientProps {
  items: Item[];
  consentFile: { url: string; type: "pdf" | "image" | "doc" } | null;
}

interface PromotionItem {
  id: string;
  type: "video" | "image";
  url: string;
  title?: string;
}

function getFileType(fileName: string): "video" | "image" {
  const ext = fileName.toLowerCase().split(".").pop();
  const videoExts = ["mp4", "webm", "mov", "avi", "mkv"];
  return videoExts.includes(ext || "") ? "video" : "image";
}

const INACTIVITY_TIMEOUT = 1 * 60 * 1000; // 1분
const ITEMS_PER_PAGE = 8; // 한 페이지당 8개 (4x2)

export function KioskPageClient({ items, consentFile }: KioskPageClientProps) {
  const router = useRouter();
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showPromotion, setShowPromotion] = useState(false);
  const [promotionItems, setPromotionItems] = useState<PromotionItem[]>([]);
  
  // 페이지네이션 상태 추가
  const [currentPage, setCurrentPage] = useState(1);

  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 현재 페이지 아이템 계산
  const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
  const currentItems = items.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // 페이지 변경 핸들러 (타이머 리셋 포함)
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    resetInactivityTimer();
  };

  // 홍보물 파일 목록 가져오기
  useEffect(() => {
    const fetchPromotionFiles = async () => {
      try {
        const response = await fetch("/api/uploads/promotion");
        if (response.ok) {
          const data = await response.json();
          const items: PromotionItem[] = (data.files || []).map(
            (fileName: string, index: number) => ({
              id: `promo-${index}-${fileName}`,
              type: getFileType(fileName),
              url: `/uploads/promotion/${fileName}`,
              title: fileName,
            })
          );
          setPromotionItems(items);
        }
      } catch (error) {
        console.error("Error fetching promotion files:", error);
      }
    };

    fetchPromotionFiles();
  }, []);

  // 타이머 리셋 함수
  const resetInactivityTimer = () => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }

    if (isDialogOpen) {
      return;
    }

    inactivityTimerRef.current = setTimeout(() => {
      const promotionPayload = {
        show: true,
        timestamp: Date.now(),
        ttl: 5000, 
      };
      sessionStorage.setItem(
        "showPromotionOnHome",
        JSON.stringify(promotionPayload)
      );
      router.push("/");
    }, INACTIVITY_TIMEOUT);
  };

  // 사용자 활동 감지
  useEffect(() => {
    const handleActivity = () => {
      if (showPromotion || isDialogOpen) {
        return;
      }
      resetInactivityTimer();
    };

    const events = [
      "mousedown",
      "mousemove",
      "keypress",
      "scroll",
      "touchstart",
      "click",
    ];

    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    resetInactivityTimer();

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [showPromotion, isDialogOpen]);

  // 다이얼로그 상태 변경 감지
  useEffect(() => {
    if (isDialogOpen) {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    } else if (!showPromotion) {
      resetInactivityTimer();
    }
  }, [isDialogOpen, showPromotion]);

  // 홍보물 닫기 핸들러
  const handleClosePromotion = () => {
    setShowPromotion(false);
    resetInactivityTimer();
  };

  // LazyCheck 핸들러
  const handleLazyCheck = async () => {
    await processAndMutateExpiredRentals();
  };

  const handleOrder = (item: Item) => {
    setSelectedItem(item);
    setIsDialogOpen(true);
  };

  return (
    <>
      <div className="min-h-screen bg-linear-to-br from-[oklch(0.75_0.12_165/0.15)] via-[oklch(0.7_0.18_350/0.15)] to-[oklch(0.7_0.18_350/0.15)]">
        <div className="container mx-auto px-6 py-10">
          <div className="mb-12 flex items-center justify-between relative">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white/80 hover:bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border-2 border-[oklch(0.75_0.12_165/0.3)] hover:border-[oklch(0.75_0.12_165)] group"
            >
              <Home className="w-5 h-5 text-[oklch(0.75_0.12_165)] group-hover:scale-110 transition-transform duration-300" />
              <span className="text-lg font-bold text-[oklch(0.75_0.12_165)]">
                홈으로
              </span>
            </Link>
            <div className="text-center flex-1">
              <h1 className="text-5xl font-black text-[oklch(0.75_0.12_165)] mb-4">
                쉬다 대여 목록
              </h1>
              <div className="h-1.5 w-32 mx-auto bg-linear-to-r from-[oklch(0.75_0.12_165)] via-[oklch(0.7_0.18_350)] to-[oklch(0.7_0.18_350)] rounded-full" />
            </div>
            <div className="w-[180px]" />
          </div>
        </div>

        {/* 아이템 그리드 영역 (flex-1, 남은 공간 차지) */}
        <div className="flex-1 container mx-auto px-6 py-4 min-h-0">
          {items.length > 0 ? (
            <div className="h-full grid grid-cols-4 grid-rows-2 gap-6">
              {currentItems.map((item) => (
                <div key={item.id} className="h-full w-full">
                  <ItemCard item={item} onOrder={handleOrder} />
                </div>
              ))}
              {/* 빈 공간 채우기 (8개보다 적을 때 레이아웃 유지용) */}
              {Array.from({ length: ITEMS_PER_PAGE - currentItems.length }).map((_, i) => (
                 <div key={`empty-${i}`} className="hidden md:block" />
              ))}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center bg-card rounded-2xl shadow-lg border-2 border-[oklch(0.75_0.12_165/0.2)]">
              <div className="text-center">
                <p className="text-3xl font-bold text-[oklch(0.75_0.12_165)] mb-2">
                  현재 대여가능한 상품이 없습니다.
                </p>
                <p className="text-lg text-muted-foreground">
                  관리자에게 문의해주세요.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 페이지네이션 컨트롤 영역 (flex-none, 하단 고정) */}
        <div className="flex-none container mx-auto px-6 pb-8 pt-2">
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-8">
              <button
                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-4 rounded-full bg-white shadow-xl border-2 border-[oklch(0.75_0.12_165/0.1)] disabled:opacity-30 disabled:cursor-not-allowed active:scale-90 transition-all hover:bg-slate-50"
              >
                <ChevronLeft className="w-10 h-10 text-slate-700" />
              </button>

              <div className="flex gap-3">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "w-4 h-4 rounded-full transition-all duration-300",
                      currentPage === i + 1
                        ? "bg-[oklch(0.75_0.12_165)] scale-125 shadow-md"
                        : "bg-black/10"
                    )}
                  />
                ))}
              </div>

              <button
                onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="p-4 rounded-full bg-white shadow-xl border-2 border-[oklch(0.75_0.12_165/0.1)] disabled:opacity-30 disabled:cursor-not-allowed active:scale-90 transition-all hover:bg-slate-50"
              >
                <ChevronRight className="w-10 h-10 text-slate-700" />
              </button>
            </div>
          )}
        </div>
        
        <RentalDialog
          item={selectedItem}
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          consentFile={consentFile}
        />
      </div>

      {showPromotion && promotionItems.length > 0 && (
        <PromotionSlider
          items={promotionItems}
          onClose={handleClosePromotion}
          autoPlay={true}
          autoPlayInterval={5000}
          onLazyCheck={handleLazyCheck}
        />
      )}
    </>
  );
}
