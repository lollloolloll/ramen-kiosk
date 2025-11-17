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
  userInteractionTimeout?: number; // 사용자 상호작용 후 자동 재생 재개 시간 (ms)
}

export function PromotionSlider({
  items,
  onClose,
  autoPlay = true,
  autoPlayInterval = 5000, //5초
  onLazyCheck,
  userInteractionTimeout = 10000, // 10초 (사용자 상호작용 후 자동 재생 재개 시간)
}: PromotionSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay); // Controls interval-based auto-play
  const [userInteracted, setUserInteracted] = useState(false); // 사용자 상호작용 여부
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const interactionTimeoutRef = useRef<NodeJS.Timeout | null>(null); // 사용자 상호작용 타이머
  const hasRunLazyCheck = useRef(false);

  const currentItem = items[currentIndex];
  const isCurrentItemVideo = currentItem?.type === "video"; // Derived state

  // 사용자 상호작용 후 자동 재생 재개 로직
  const resetAutoPlayAfterInteraction = () => {
    setUserInteracted(true); // 사용자 상호작용 발생
    setIsPlaying(false); // 자동 재생 일시 중지

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    if (interactionTimeoutRef.current) {
      clearTimeout(interactionTimeoutRef.current);
    }

    interactionTimeoutRef.current = setTimeout(() => {
      setUserInteracted(false); // 비활성 상태로 전환
      setIsPlaying(autoPlay); // 자동 재생 재개 (초기 autoPlay 설정에 따름)
    }, userInteractionTimeout);
  };

  // 홍보물이 나타날 때 한 번만 lazyCheck 실행
  useEffect(() => {
    if (!hasRunLazyCheck.current && onLazyCheck) {
      onLazyCheck().catch((err) =>
        console.error("LazyCheck on mount failed:", err)
      );
      hasRunLazyCheck.current = true;
    }
  }, [onLazyCheck]);

  // 자동 슬라이드 (이미지일 경우에만 작동)
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Only set interval if autoPlay is enabled, there are multiple items,
    // the current item is NOT a video, and no recent user interaction.
    if (isPlaying && items.length > 1 && !isCurrentItemVideo && !userInteracted) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % items.length);
      }, autoPlayInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, items.length, autoPlayInterval, isCurrentItemVideo, userInteracted]); // Add userInteracted to dependencies

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
    resetAutoPlayAfterInteraction(); // 사용자 상호작용 후 자동 재생 재개 로직 호출
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % items.length);
    resetAutoPlayAfterInteraction(); // 사용자 상호작용 후 자동 재생 재개 로직 호출
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

  // currentItem is already defined above

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
            loop={false} // Video should not loop if it's controlling slide advancement
            muted
            playsInline
            onEnded={() => {
              if (items.length > 1) {
                setCurrentIndex((prev) => (prev + 1) % items.length);
                setUserInteracted(false); // 비디오 종료 시 사용자 상호작용 상태 초기화
                setIsPlaying(autoPlay); // Resume auto-play for the next item if autoPlay is true
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
                resetAutoPlayAfterInteraction(); // 사용자 상호작용 후 자동 재생 재개 로직 호출
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
