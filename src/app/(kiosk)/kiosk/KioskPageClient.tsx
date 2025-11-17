"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Home } from "lucide-react";
import { ItemCard } from "@/components/item/ItemCard";
import { Item } from "@/app/(admin)/admin/items/columns";
import { RentalDialog } from "@/components/item/RentalDialog";
import { PromotionSlider } from "@/components/PromotionSlider";
import { processAndMutateExpiredRentals } from "@/lib/actions/rental";

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

// 파일 확장자로 타입 구분
function getFileType(fileName: string): "video" | "image" {
  const ext = fileName.toLowerCase().split(".").pop();
  const videoExts = ["mp4", "webm", "mov", "avi", "mkv"];
  return videoExts.includes(ext || "") ? "video" : "image";
}

// 비활성 시간 설정 (밀리초)
// const INACTIVITY_TIMEOUT = 30 * 1000; // 30초
const INACTIVITY_TIMEOUT = 5 * 1000; // 테스트용 5초

export function KioskPageClient({ items, consentFile }: KioskPageClientProps) {
  const router = useRouter();
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showPromotion, setShowPromotion] = useState(false);
  const [promotionItems, setPromotionItems] = useState<PromotionItem[]>([]);

  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

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
    console.log("Resetting inactivity timer");

    // 기존 타이머 제거
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }

    // 다이얼로그가 열려있으면 타이머 설정 안 함
    if (isDialogOpen) {
      console.log("Dialog is open, not setting timer");
      return;
    }

    // 타이머 설정
    inactivityTimerRef.current = setTimeout(() => {
      console.log("Inactivity timeout - showing promotion");
      setShowPromotion(true);
    }, INACTIVITY_TIMEOUT);
  };

  // 사용자 활동 감지
  useEffect(() => {
    const handleActivity = () => {
      // 홍보물이 표시 중이거나 다이얼로그가 열려있으면 활동 감지 무시
      if (showPromotion || isDialogOpen) {
        return;
      }

      resetInactivityTimer();
    };

    // 다양한 이벤트 리스너 등록
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

    // 초기 타이머 설정
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

  // 홍보물이 표시되면 리다이렉트 타이머 시작
  useEffect(() => {
    if (showPromotion) {
      console.log("Promotion shown, starting redirect timer");

      const redirectTimer = setTimeout(() => {
        console.log("Redirecting to home");
        router.push("/");
      }, INACTIVITY_TIMEOUT);

      return () => {
        console.log("Cleaning up redirect timer");
        clearTimeout(redirectTimer);
      };
    }
  }, [showPromotion, router]);

  // 다이얼로그 상태 변경 감지
  useEffect(() => {
    if (isDialogOpen) {
      console.log("Dialog opened, clearing timer");
      // 다이얼로그가 열리면 타이머 정지
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    } else if (!showPromotion) {
      console.log("Dialog closed, restarting timer");
      // 다이얼로그가 닫히고 홍보물도 없으면 타이머 재시작
      resetInactivityTimer();
    }
  }, [isDialogOpen, showPromotion]);

  // 홍보물 닫기 핸들러
  const handleClosePromotion = () => {
    console.log("Promotion closed by user");
    setShowPromotion(false);

    // 새로운 비활성 타이머 시작
    resetInactivityTimer();
  };

  // LazyCheck 핸들러
  const handleLazyCheck = async () => {
    console.log("Triggering lazy check from kiosk promotion...");
    await processAndMutateExpiredRentals();
  };

  const handleOrder = (item: Item) => {
    setSelectedItem(item);
    setIsDialogOpen(true);
    console.log("Dialog opened for item:", item.name);
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-[oklch(0.75_0.12_165/0.15)] via-[oklch(0.7_0.18_350/0.15)] to-[oklch(0.7_0.18_350/0.15)]">
        <div className="container mx-auto px-6 py-10">
          {/* 홈 버튼과 제목 */}
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
              <div className="h-1.5 w-32 mx-auto bg-gradient-to-r from-[oklch(0.75_0.12_165)] via-[oklch(0.7_0.18_350)] to-[oklch(0.7_0.18_350)] rounded-full" />
            </div>
            {/* 우측 여백을 위한 빈 공간 */}
            <div className="w-[180px]" />
          </div>

          {items.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {items.map((item) => (
                <ItemCard key={item.id} item={item} onOrder={handleOrder} />
              ))}
            </div>
          ) : (
            <div className="text-center mt-20 bg-card rounded-2xl p-12 shadow-lg border-2 border-[oklch(0.75_0.12_165/0.2)]">
              <p className="text-3xl font-bold text-[oklch(0.75_0.12_165)] mb-2">
                현재 대여가능한 상품이 없습니다.
              </p>
              <p className="text-lg text-muted-foreground">
                관리자에게 문의해주세요.
              </p>
            </div>
          )}

          <RentalDialog
            item={selectedItem}
            open={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            consentFile={consentFile}
          />
        </div>
      </div>

      {/* 홍보물 슬라이드 */}
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
