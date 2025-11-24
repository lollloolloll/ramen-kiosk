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

  // --- [수정됨] 스와이프 핸들러 로직 개선 ---
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    // [중요] 터치 시작 시 End 값도 현재 위치로 초기화해야
    // 단순히 클릭만 했을 때 이전 좌표값 때문에 스와이프로 오작동하는 것을 방지함
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    // 시작점과 끝점의 차이 계산
    const diff = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50;

    // 단순 클릭(차이가 0이거나 매우 작음)이 아닌 경우에만 스와이프 동작 수행
    if (Math.abs(diff) > minSwipeDistance) {
      if (diff > 0) {
        goToNext();
      } else {
        goToPrevious();
      }
    }
  };
  // ----------------------------------------

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

  // 이벤트 전파 방지용 함수
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
        // [수정됨] 모바일 터치 시 이벤트가 부모(스와이프 핸들러)로 새어나가는 것 방지 강화
        onTouchStart={handleStopPropagation}
        onTouchMove={handleStopPropagation}
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
          // [추가] 버튼 영역에서 스와이프 로직과 겹치지 않도록 터치 이벤트 차단
          onTouchStart={handleStopPropagation}
          onTouchEnd={(e) => {
            e.stopPropagation();
            // 터치로 눌렀을 때도 동작하게 하려면 여기서 실행 (선택사항)
            // goToPrevious();
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
          // [추가] 버튼 영역에서 스와이프 로직과 겹치지 않도록 터치 이벤트 차단
          onTouchStart={handleStopPropagation}
          onTouchEnd={(e) => {
            e.stopPropagation();
          }}
          className="absolute right-0 top-0 w-1/4 h-full z-40 flex items-center justify-end cursor-pointer group"
        >
          <div className="mr-2 p-2 rounded-full bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity md:opacity-50">
            <ChevronRight className="w-8 h-8 text-white" />
          </div>
        </div>
      )}

      {/* 슬라이드 컨텐츠 */}
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
              // [추가] 인디케이터 터치 시 스와이프 방지
              onTouchStart={handleStopPropagation}
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
