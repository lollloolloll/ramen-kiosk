"use client";

import { useState, useEffect, useRef } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PromotionItem {
  id: string;
  type: "video" | "image";
  url: string;
  title?: string;
}

interface PromotionSliderProps {
  items: PromotionItem[];
  onClose?: () => void;
  autoPlay?: boolean;
  autoPlayInterval?: number;
  onLazyCheck?: () => Promise<void>; // lazyCheck 함수 prop 추가
}

export function PromotionSlider({
  items,
  onClose,
  autoPlay = true,
  autoPlayInterval = 5000,
  onLazyCheck,
}: PromotionSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasRunLazyCheck = useRef(false);

  // 홍보물이 나타날 때 한 번만 lazyCheck 실행
  useEffect(() => {
    if (!hasRunLazyCheck.current && onLazyCheck) {
      onLazyCheck().catch((err) =>
        console.error("LazyCheck on mount failed:", err)
      );
      hasRunLazyCheck.current = true;
    }
  }, [onLazyCheck]);

  // 자동 슬라이드
  useEffect(() => {
    if (isPlaying && items.length > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % items.length);
      }, autoPlayInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, items.length, autoPlayInterval]);

  // 비디오 재생 제어
  useEffect(() => {
    items.forEach((item, index) => {
      const video = videoRefs.current[item.id];
      if (video) {
        if (index === currentIndex && item.type === "video") {
          video.play().catch(() => {
            // 자동 재생 실패 시 무시
          });
        } else {
          video.pause();
          video.currentTime = 0;
        }
      }
    });
  }, [currentIndex, items]);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
    setIsPlaying(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % items.length);
    setIsPlaying(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  // 🆕 슬라이드 클릭 시: 닫기 + LazyCheck + Fullscreen
  const handleSlideClick = async () => {
    // 1. LazyCheck 실행 (비동기, non-blocking)
    if (onLazyCheck) {
      onLazyCheck().catch((err) =>
        console.error("LazyCheck on click failed:", err)
      );
    }

    // 2. 홍보물 닫기
    if (onClose) {
      onClose();
    }

    // 3. Fullscreen 진입
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch (err) {
      console.log("Fullscreen request failed:", err);
    }
  };

  if (items.length === 0) {
    return null;
  }

  const currentItem = items[currentIndex];

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
      {/* 이전 버튼 */}
      {items.length > 1 && (
        <Button
          variant="ghost"
          size="icon"
          onClick={goToPrevious}
          className="absolute left-4 z-50 text-white hover:bg-white/20 rounded-full"
        >
          <ChevronLeft className="w-8 h-8" />
        </Button>
      )}

      {/* 다음 버튼 */}
      {items.length > 1 && (
        <Button
          variant="ghost"
          size="icon"
          onClick={goToNext}
          className="absolute right-4 z-50 text-white hover:bg-white/20 rounded-full"
        >
          <ChevronRight className="w-8 h-8" />
        </Button>
      )}

      {/* 슬라이드 컨텐츠 - 클릭 시 닫기 + Fullscreen */}
      <div
        className="w-full h-full flex items-center justify-center cursor-pointer"
        onClick={handleSlideClick}
      >
        {currentItem.type === "video" ? (
          <video
            ref={(el) => {
              videoRefs.current[currentItem.id] = el;
            }}
            src={currentItem.url}
            className="max-w-full max-h-full object-contain"
            loop
            muted
            playsInline
            onEnded={() => {
              if (items.length > 1) {
                setCurrentIndex((prev) => (prev + 1) % items.length);
              }
            }}
          />
        ) : (
          <img
            src={currentItem.url}
            alt={currentItem.title || "홍보 이미지"}
            className="max-w-full max-h-full object-contain"
          />
        )}
      </div>

      {/* 인디케이터 */}
      {items.length > 1 && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-2">
          {items.map((_, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation(); // 슬라이드 클릭 이벤트 전파 방지
                setCurrentIndex(index);
                setIsPlaying(false);
                if (intervalRef.current) {
                  clearInterval(intervalRef.current);
                }
              }}
              className={`w-3 h-3 rounded-full transition-all ${
                index === currentIndex
                  ? "bg-white w-8"
                  : "bg-white/50 hover:bg-white/75"
              }`}
              aria-label={`슬라이드 ${index + 1}로 이동`}
            />
          ))}
        </div>
      )}

      {/* 재생/일시정지 표시 제거 (더 이상 필요 없음) */}
    </div>
  );
}
