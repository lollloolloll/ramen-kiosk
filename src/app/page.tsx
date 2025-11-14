"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PromotionSlider } from "@/components/PromotionSlider";
import { processAndMutateExpiredRentals } from "@/lib/actions/rental";

// 홍보물 데이터
const PROMOTION_ITEMS = [
  {
    id: "1",
    type: "video" as const,
    url: "/promotions/video1.mp4",
    title: "홍보 영상 1",
  },
  {
    id: "2",
    type: "image" as const,
    url: "/promotions/image1.jpg",
    title: "홍보 이미지 1",
  },
];

// 비활성 시간 설정 (밀리초)
const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10분

export default function Home() {
  const [showPromotion, setShowPromotion] = useState(true);
  const [hasShownInitialPromotion, setHasShownInitialPromotion] =
    useState(false);
  const lastActivityRef = useRef<number>(Date.now());
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 타이머 리셋 함수 (홍보물은 닫지 않음)
  const resetInactivityTimer = () => {
    lastActivityRef.current = Date.now();

    // 기존 타이머 제거
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }

    // 홍보물이 표시 중이 아닐 때만 새 타이머 설정
    if (!showPromotion) {
      inactivityTimerRef.current = setTimeout(() => {
        setShowPromotion(true);
      }, INACTIVITY_TIMEOUT);
    }
  };

  // 사용자 활동 감지
  useEffect(() => {
    const handleActivity = () => {
      // 홍보물이 표시 중이면 활동 감지 무시
      if (showPromotion) {
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
    inactivityTimerRef.current = setTimeout(() => {
      setShowPromotion(true);
    }, INACTIVITY_TIMEOUT);

    // 처음 앱 킬 때 홍보물 표시 (한 번만)
    if (PROMOTION_ITEMS.length > 0 && !hasShownInitialPromotion) {
      const hasSeenPromotion = sessionStorage.getItem(
        "hasSeenInitialPromotion"
      );
      if (!hasSeenPromotion) {
        setShowPromotion(true);
        setHasShownInitialPromotion(true);
        sessionStorage.setItem("hasSeenInitialPromotion", "true");
      }
    }

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [showPromotion, hasShownInitialPromotion]);

  // 홍보물 닫기 핸들러
  const handleClosePromotion = () => {
    setShowPromotion(false);
    lastActivityRef.current = Date.now();

    // 새로운 타이머 설정
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }

    inactivityTimerRef.current = setTimeout(() => {
      setShowPromotion(true);
    }, INACTIVITY_TIMEOUT);
  };
  const handleLazyCheck = async () => {
    console.log("Triggering lazy check from promotion screen...");
    await processAndMutateExpiredRentals();
  };

  return (
    <>
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
            <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-tight">
              학교 끝나고 뭐할래?
              <br />
              <span className="text-[oklch(0.75_0.12_165)]">
                <span style={{ color: "oklch(0.75 0.25 350)" }}>쌍청문</span>
                에서 놀자! 🎉
              </span>
            </h1>
          </div>

          {/* 메인 버튼 */}
          <div className="pt-8">
            <Button
              asChild
              size="lg"
              className="h-20 px-16 text-2xl font-bold bg-gradient-to-r from-[oklch(0.75_0.12_165)] via-[oklch(0.7_0.18_350)] to-[oklch(0.7_0.18_350)] hover:from-[oklch(0.7_0.12_165)] hover:via-[oklch(0.65_0.18_350)] hover:to-[oklch(0.65_0.18_350)] transition-all duration-300 transform hover:scale-110 shadow-2xl rounded-2xl"
            >
              <Link href="/kiosk">😎 놀 준비 완료!</Link>
            </Button>
          </div>

          {/* 안내 텍스트 */}
          {/* <p className="text-sm text-muted-foreground animate-pulse">
            화면을 터치하여 시작하세요
          </p> */}
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

      {/* 홍보물 슬라이드 */}
      {showPromotion && PROMOTION_ITEMS.length > 0 && (
        <PromotionSlider
          items={PROMOTION_ITEMS}
          onClose={handleClosePromotion}
          autoPlay={true}
          autoPlayInterval={5000}
          onLazyCheck={handleLazyCheck}
        />
      )}
    </>
  );
}
