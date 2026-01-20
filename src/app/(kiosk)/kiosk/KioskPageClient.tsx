"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Home } from "lucide-react";
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

export function KioskPageClient({ items, consentFile }: KioskPageClientProps) {
  const router = useRouter();
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showPromotion, setShowPromotion] = useState(false);
  const [promotionItems, setPromotionItems] = useState<PromotionItem[]>([]);
  
  // 카테고리 필터 상태
  const [selectedCategory, setSelectedCategory] = useState<string>("전체");

  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 카테고리 목록 추출 (전체 + 고유 카테고리들)
  const categories = useMemo(() => {
    const uniqueCategories = Array.from(new Set(items.map(item => item.category)));
    return ["전체", ...uniqueCategories.sort()];
  }, [items]);

  // 필터링된 아이템
  const filteredItems = useMemo(() => {
    if (selectedCategory === "전체") {
      return items;
    }
    return items.filter(item => item.category === selectedCategory);
  }, [items, selectedCategory]);

  // 카테고리 변경 핸들러 (타이머 리셋 포함)
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    resetInactivityTimer();
  };
  
  useEffect(() => {
    router.refresh();
  }, [router]);

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
          {/* 상단 헤더 영역 */}
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
            
            {/* 카테고리 필터 (우측 상단) */}
            <div className="flex items-center gap-3">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => handleCategoryChange(category)}
                  className={cn(
                    "px-6 py-3 rounded-2xl font-bold transition-all duration-300 transform hover:scale-105 shadow-lg",
                    selectedCategory === category
                      ? "bg-[oklch(0.75_0.12_165)] text-white border-2 border-[oklch(0.75_0.12_165)]"
                      : "bg-white/80 hover:bg-white text-[oklch(0.75_0.12_165)] border-2 border-[oklch(0.75_0.12_165/0.3)] hover:border-[oklch(0.75_0.12_165)]"
                  )}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 아이템 그리드 영역 */}
        <div className="flex-1 container mx-auto px-6 pb-10 min-h-0">
          {filteredItems.length > 0 ? (
            <div className="grid grid-cols-4 gap-6 auto-rows-fr">
              {filteredItems.map((item) => (
                <div key={item.id} className="h-full w-full">
                  <ItemCard item={item} onOrder={handleOrder} />
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center bg-card rounded-2xl shadow-lg border-2 border-[oklch(0.75_0.12_165/0.2)]">
              <div className="text-center">
                <p className="text-3xl font-bold text-[oklch(0.75_0.12_165)] mb-2">
                  {selectedCategory === "전체" 
                    ? "현재 대여가능한 상품이 없습니다."
                    : `${selectedCategory} 카테고리에 대여가능한 상품이 없습니다.`
                  }
                </p>
                <p className="text-lg text-muted-foreground">
                  {selectedCategory === "전체"
                    ? "관리자에게 문의해주세요."
                    : "다른 카테고리를 선택해주세요."
                  }
                </p>
              </div>
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