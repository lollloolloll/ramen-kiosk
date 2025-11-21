"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight, Volume2, VolumeX } from "lucide-react";
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
  onLazyCheck?: () => Promise<void>;
  userInteractionTimeout?: number;
}

export function PromotionSlider({
  items,
  onClose,
  autoPlay = true,
  autoPlayInterval = 20 * 1000,
  onLazyCheck,
  userInteractionTimeout = 5 * 1000,
}: PromotionSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [userInteracted, setUserInteracted] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const interactionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 스와이프 관련 상태
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentItem = items[currentIndex];
  const isCurrentItemVideo = currentItem?.type === "video";

  // 슬라이드 전환 시마다 lazyCheck 실행
  useEffect(() => {
    if (onLazyCheck) {
      onLazyCheck().catch((err) => console.error("LazyCheck failed:", err));
    }
  }, [currentIndex, onLazyCheck]);

  // 전역 음소거 상태를 모든 비디오에 적용
  useEffect(() => {
    Object.values(videoRefs.current).forEach((video) => {
      if (video) video.muted = isMuted;
    });
  }, [isMuted]);

  const resetAutoPlayAfterInteraction = useCallback(() => {
    setUserInteracted(true);
    setIsPlaying(false);

    if (intervalRef.current) clearInterval(intervalRef.current);
    if (interactionTimeoutRef.current)
      clearTimeout(interactionTimeoutRef.current);

    interactionTimeoutRef.current = setTimeout(() => {
      setUserInteracted(false);
      setIsPlaying(autoPlay);
    }, userInteractionTimeout);
  }, [autoPlay, userInteractionTimeout]);

  // 자동 슬라이드 (이미지일 경우에만)
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    if (
      isPlaying &&
      items.length > 1 &&
      !isCurrentItemVideo &&
      !userInteracted
    ) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % items.length);
      }, autoPlayInterval);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [
    isPlaying,
    items.length,
    autoPlayInterval,
    isCurrentItemVideo,
    userInteracted,
  ]);

  // 비디오 재생 제어
  useEffect(() => {
    items.forEach((item, index) => {
      const video = videoRefs.current[item.id];
      if (video) {
        video.muted = isMuted;
        if (index === currentIndex && item.type === "video") {
          video.play().catch(() => {});
        } else {
          video.pause();
          video.currentTime = 0;
        }
      }
    });
  }, [currentIndex, items, isMuted]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
    resetAutoPlayAfterInteraction();
  }, [items.length, resetAutoPlayAfterInteraction]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % items.length);
    resetAutoPlayAfterInteraction();
  }, [items.length, resetAutoPlayAfterInteraction]);

  // 스와이프 핸들러
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50;

    if (Math.abs(diff) > minSwipeDistance) {
      if (diff > 0) {
        goToNext();
      } else {
        goToPrevious();
      }
    }
  };

  // 슬라이드 클릭 시: 닫기 + Fullscreen
  const handleSlideClick = async () => {
    if (onClose) onClose();

    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch (err) {
      console.log("Fullscreen request failed:", err);
    }
  };

  const handleStopPropagation = (e: React.TouchEvent | React.MouseEvent) => {
    e.stopPropagation();
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMuted((prev) => !prev);
  };

  if (items.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black flex items-center justify-center"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* 음소거 토글 버튼 */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleMute}
        onTouchStart={handleStopPropagation}
        onTouchEnd={handleStopPropagation}
        className="absolute top-4 right-4 z-[60] text-white hover:bg-white/20 rounded-full bg-black/30"
      >
        {isMuted ? (
          <VolumeX className="w-6 h-6" />
        ) : (
          <Volume2 className="w-6 h-6" />
        )}
      </Button>

      {/* 좌측 영역 (이전 슬라이드) */}
      {items.length > 1 && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            goToPrevious();
          }}
          className="absolute left-0 top-0 w-1/4 h-full z-40 flex items-center justify-start cursor-pointer group"
        >
          <div className="ml-2 p-2 rounded-full bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity md:opacity-50">
            <ChevronLeft className="w-8 h-8 text-white" />
          </div>
        </div>
      )}

      {/* 우측 영역 (다음 슬라이드) */}
      {items.length > 1 && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            goToNext();
          }}
          className="absolute right-0 top-0 w-1/4 h-full z-40 flex items-center justify-end cursor-pointer group"
        >
          <div className="mr-2 p-2 rounded-full bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity md:opacity-50">
            <ChevronRight className="w-8 h-8 text-white" />
          </div>
        </div>
      )}

      {/* 슬라이드 컨텐츠 (중앙 50% 영역) */}
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
            loop={false}
            muted={isMuted}
            playsInline
            onEnded={() => {
              if (items.length > 1) {
                setCurrentIndex((prev) => (prev + 1) % items.length);
                setUserInteracted(false);
                setIsPlaying(autoPlay);
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
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-2 z-50">
          {items.map((_, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(index);
                resetAutoPlayAfterInteraction();
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
    </div>
  );
}
