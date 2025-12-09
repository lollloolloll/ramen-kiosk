"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PromotionSlider } from "@/components/PromotionSlider";
import { processAndMutateExpiredRentals } from "@/lib/actions/rental";
import { Heart, MonitorPlay, Sparkle, Sparkles } from "lucide-react";

// 인터페이스 수정: url, pdf 타입 추가
interface PromotionItem {
  id: string;
  type: "video" | "image" | "url" | "pdf";
  url: string;
  title?: string;
}

// URL 데이터 타입 (API 응답용)
interface VideoUrl {
  type: "url";
  name: string;
  url: string;
}

// 파일 타입 판별 함수 수정: PDF 추가
function getFileType(fileName: string): "video" | "image" | "pdf" {
  const ext = fileName.toLowerCase().split(".").pop();
  const videoExts = ["mp4", "webm", "mov", "avi", "mkv"];

  if (ext === "pdf") return "pdf";
  if (videoExts.includes(ext || "")) return "video";
  return "image";
}

// 비활성 시간 설정 (밀리초)
const INACTIVITY_TIMEOUT = 1 * 60 * 1000; // 1분

export default function Home() {
  const [showPromotion, setShowPromotion] = useState(false);
  const [hasShownInitialPromotion, setHasShownInitialPromotion] =
    useState(false);
  const [promotionItems, setPromotionItems] = useState<PromotionItem[]>([]);
  const lastActivityRef = useRef<number>(Date.now());
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasCheckedKioskFlag = useRef(false);

  // 업로드된 홍보물 파일 및 URL 목록 가져오기
  useEffect(() => {
    const fetchPromotionFiles = async () => {
      try {
        const response = await fetch("/api/uploads/promotion");
        if (response.ok) {
          const data = await response.json();

          // 1. 파일 아이템 변환
          const fileItems: PromotionItem[] = (data.files || []).map(
            (fileName: string, index: number) => ({
              id: `file-${index}-${fileName}`,
              type: getFileType(fileName),
              url: `/uploads/promotion/${fileName}`,
              title: fileName,
            })
          );

          // 2. 외부 URL 아이템 변환 (유튜브 등)
          const urlItems: PromotionItem[] = (data.urls || []).map(
            (urlData: VideoUrl, index: number) => ({
              id: `url-${index}-${urlData.name}`,
              type: "url" as const,
              url: urlData.url,
              title: urlData.name,
            })
          );

          // 3. 합치기
          setPromotionItems([...fileItems, ...urlItems]);
          console.log(
            `Loaded ${fileItems.length + urlItems.length} promotion items`
          );
        }
      } catch (error) {
        console.error("Error fetching promotion files:", error);
      }
    };

    fetchPromotionFiles();
  }, []);

  // Kiosk에서 넘어온 플래그 확인
  useEffect(() => {
    if (hasCheckedKioskFlag.current || promotionItems.length === 0) {
      return;
    }

    const promotionFlag = sessionStorage.getItem("showPromotionOnHome");

    if (promotionFlag) {
      try {
        const payload = JSON.parse(promotionFlag);
        const now = Date.now();

        // TTL(5초) 내에 리다이렉트 된 경우에만 즉시 실행
        if (
          payload.show &&
          payload.timestamp &&
          now - payload.timestamp < payload.ttl
        ) {
          console.log("Valid promotion flag from kiosk - showing promotion");
          sessionStorage.removeItem("showPromotionOnHome");
          setShowPromotion(true);
          hasCheckedKioskFlag.current = true;
          return;
        } else {
          console.log("Expired promotion flag - ignoring");
          sessionStorage.removeItem("showPromotionOnHome");
        }
      } catch (e) {
        console.error("Invalid promotion flag format:", e);
        sessionStorage.removeItem("showPromotionOnHome");
      }
    }

    hasCheckedKioskFlag.current = true;
  }, [promotionItems]);

  // 타이머 리셋 로직
  const resetInactivityTimer = () => {
    lastActivityRef.current = Date.now();

    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }

    if (!showPromotion) {
      inactivityTimerRef.current = setTimeout(() => {
        setShowPromotion(true);
      }, INACTIVITY_TIMEOUT);
    }
  };

  // 사용자 활동 감지
  useEffect(() => {
    const handleActivity = () => {
      if (showPromotion) return;
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

    // 키오스크 플래그가 없을 때만 초기 타이머 시작
    if (!sessionStorage.getItem("showPromotionOnHome")) {
      inactivityTimerRef.current = setTimeout(() => {
        setShowPromotion(true);
      }, INACTIVITY_TIMEOUT);
    }

    // 앱 최초 실행 시 홍보물 표시 (한 번만)
    if (
      promotionItems.length > 0 &&
      !hasShownInitialPromotion &&
      !sessionStorage.getItem("showPromotionOnHome")
    ) {
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
  }, [showPromotion, hasShownInitialPromotion, promotionItems.length]);

  // 홍보물 닫기 핸들러
  const handleClosePromotion = () => {
    setShowPromotion(false);
    lastActivityRef.current = Date.now();

    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    // 닫은 후 다시 타이머 시작
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
      <div className="relative flex flex-col items-center justify-center min-h-screen w-full overflow-hidden bg-slate-50 font-sans selection:bg-[oklch(0.75_0.12_165/0.2)]">
        {/* 1. 배경: 동적인 그라데이션 블러 효과 (Lava Lamp 느낌) */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <div
            className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-[oklch(0.75_0.12_165/0.2)] rounded-full blur-[100px] animate-pulse"
            style={{ animationDuration: "8s" }}
          />
          <div
            className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] bg-[oklch(0.7_0.18_350/0.2)] rounded-full blur-[120px] animate-pulse"
            style={{ animationDuration: "10s", animationDelay: "1s" }}
          />
          <div
            className="absolute top-[40%] left-[30%] w-[40vw] h-[40vw] bg-purple-200/40 rounded-full blur-[80px] animate-pulse"
            style={{ animationDuration: "12s", animationDelay: "2s" }}
          />
        </div>

        {/* 2. 관리자/전체화면 컨트롤 */}
        <Link
          href="/admin"
          prefetch={false}
          className="absolute top-6 right-6 text-sm text-muted-foreground hover:text-[oklch(0.75_0.12_165)] transition-colors"
        >
          관리자
        </Link>
        <p
          className="absolute top-6 right-20 text-sm text-muted-foreground hover:text-[oklch(0.75_0.12_165)] transition-colors cursor-pointer"
          onClick={async () => {
            try {
              if (!document.fullscreenElement) {
                await document.documentElement.requestFullscreen();
              }
            } catch (err) {
              console.log("Fullscreen request failed:", err);
            }
          }}
        >
          전체화면
        </p>

        {/* 3. 떠다니는 스티커 아이콘들 */}
        <FloatingSticker
          emoji="🎮"
          className="top-[15%] left-[10%] rotate-[-12deg]"
          delay="0s"
        />
        <FloatingSticker
          emoji="🎤"
          className="top-[20%] right-[12%] rotate-[12deg]"
          delay="1.5s"
        />
        <FloatingSticker
          emoji="🎲"
          className="bottom-[25%] left-[15%] rotate-[6deg]"
          delay="0.5s"
        />
        <FloatingSticker
          emoji="🍜"
          className="bottom-[20%] right-[10%] rotate-[-6deg]"
          delay="2s"
        />

        {/* 4. 메인 컨텐츠 */}
        <div className="relative z-10 flex flex-col items-center text-center space-y-10 px-4">
          {/* 헤드라인 그룹 */}
          <div className="space-y-6 animate-in fade-in zoom-in duration-700 slide-in-from-bottom-10">
            <div className="inline-flex items-center justify-center px-3 py-1.5 rounded-full bg-white/60 border border-white/50 backdrop-blur-sm shadow-sm mb-4">
              <span className="text-sm font-bold text-slate-500 flex items-center gap-1">
                <Sparkle className="w-4 h-4 text-[oklch(0.75_0.12_165)]" />
                우리들의 아지트
              </span>
            </div>

            {/* 옵션 2: Heart (머물다, 따뜻함) */}
            <div className="ml-4 inline-flex items-center justify-center px-3 py-1.5 rounded-full bg-white/60 border border-white/50 backdrop-blur-sm shadow-sm mb-4">
              <span className="text-sm font-bold text-slate-500 flex items-center gap-1">
                <Heart className="w-4 h-4 text-[oklch(0.75_0.12_165)]" />
                나의 미성숙함이 머물다 가는 곳
              </span>
            </div>

            <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-[1.1] text-slate-800 drop-shadow-sm">
              학교 끝나고
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[oklch(0.75_0.12_165)] to-[oklch(0.7_0.18_350)]">
                뭐하고 놀래?
              </span>
            </h1>

            <p className="text-xl md:text-2xl font-medium text-slate-500">
              <span className="font-bold text-[oklch(0.7_0.18_350)]">
                쌍청문
              </span>
              으로 다 모여! 🎉
            </p>
          </div>

          {/* CTA 버튼 */}
          {/* CTA 버튼 */}
          <div className="pt-4 animate-in fade-in zoom-in duration-1000 delay-300 slide-in-from-bottom-10 fill-mode-backwards">
            <Button
              asChild
              className="group relative h-24 px-12 text-3xl md:text-4xl font-black rounded-[2rem] 
            bg-white text-slate-800 border-4 border-slate-100
            shadow-[0_8px_30px_rgb(0,0,0,0.04)] 
            
            /* 호버 시: 크기만 살짝 커지고, 그림자만 부드럽게. 테두리나 배경색 강하게 변경 X */
            hover:scale-105 hover:bg-white hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)]
            active:scale-95 active:shadow-sm
            transition-all duration-300 overflow-hidden"
            >
              <Link href="/kiosk" className="flex items-center gap-4">
                {/* 배경: 호버 시 아주 연한 틴트(10% 투명도)만 살짝 올라옴 -> 글자 가독성 해치지 않음 */}
                <div className="absolute inset-0 bg-gradient-to-r from-[oklch(0.75_0.12_165/0.1)] to-[oklch(0.7_0.18_350/0.1)] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* 텍스트: 색상 변경 없이 그대로 유지 */}
                <span className="relative z-10 text-slate-800">
                  😎 놀 준비 완료!
                </span>

                {/* 아이콘: 색상 반전 없이 회전 애니메이션만 살짝 */}
                <div className="relative z-10 bg-slate-800 text-white rounded-full p-2 group-hover:rotate-12 transition-transform duration-300 shadow-sm">
                  <MonitorPlay
                    className="w-6 h-6 md:w-8 md:h-8"
                    fill="currentColor"
                  />
                </div>
              </Link>
            </Button>
          </div>
        </div>

        {/* 5. 하단 무한 스크롤 띠 */}
        <div className="absolute bottom-10 w-full overflow-hidden bg-white/30 backdrop-blur-md border-y border-white/20 py-3 transform -rotate-1 shadow-sm">
          <div className="flex animate-marquee whitespace-nowrap">
            <MarqueeText />
            <MarqueeText />
            <MarqueeText />
            <MarqueeText />
          </div>
        </div>
      </div>

      {/* 홍보물 슬라이드 (기존 기능 유지) */}
      {showPromotion && promotionItems.length > 0 && (
        <PromotionSlider
          items={promotionItems}
          onClose={handleClosePromotion}
          autoPlay={true}
          autoPlayInterval={15000}
          onLazyCheck={handleLazyCheck}
        />
      )}

      {/* Marquee 애니메이션 스타일 */}
      <style jsx global>{`
        @keyframes marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-100%);
          }
        }
        .animate-marquee {
          animation: marquee 20s linear infinite;
        }
      `}</style>
    </>
  );
}

// 스티커 컴포넌트
function FloatingSticker({
  emoji,
  className,
  delay,
}: {
  emoji: string;
  className: string;
  delay: string;
}) {
  return (
    <div
      className={`absolute flex items-center justify-center w-20 h-20 md:w-24 md:h-24 bg-white rounded-2xl shadow-[0_8px_20px_rgba(0,0,0,0.1)] border-4 border-white transform hover:scale-110 transition-transform duration-300 cursor-default select-none animate-bounce ${className}`}
      style={{ animationDuration: "3s", animationDelay: delay }}
    >
      <span className="text-5xl md:text-6xl filter drop-shadow-sm">
        {emoji}
      </span>
    </div>
  );
}

// 하단 흐르는 텍스트 컴포넌트
function MarqueeText() {
  return (
    <span className="mx-4 text-lg font-bold text-slate-500/80 flex items-center gap-8">
      <span>🎮 닌텐도 스위치</span>
      <span className="w-2 h-2 rounded-full bg-[oklch(0.75_0.12_165)]"></span>
      <span>🍜 라면</span>
      <span className="w-2 h-2 rounded-full bg-[oklch(0.7_0.18_350)]"></span>
      <span>🎲 보드게임</span>
      <span className="w-2 h-2 rounded-full bg-[oklch(0.75_0.12_165)]"></span>
      <span>🏸 배드민턴</span>
      <span className="w-2 h-2 rounded-full bg-[oklch(0.7_0.18_350)]"></span>
      <span>🍿 맛있는 간식</span>
      <span className="w-2 h-2 rounded-full bg-slate-300"></span>
      <span>🏀 농구</span>
      <span className="w-2 h-2 rounded-full bg-[oklch(0.75_0.12_165)]"></span>
      <span>🏓 탁구</span>
      <span className="w-2 h-2 rounded-full bg-[oklch(0.7_0.18_350)]"></span>
    </span>
  );
}
