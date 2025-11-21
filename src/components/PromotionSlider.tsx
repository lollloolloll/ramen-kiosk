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
  onLazyCheck?: () => Promise<void>;
  userInteractionTimeout?: number;
}

export function PromotionSlider({
  items,
  onClose,
  autoPlay = true,
  autoPlayInterval = 5000, // 5초
  onLazyCheck,
  userInteractionTimeout = 10000, //10초
}: PromotionSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [userInteracted, setUserInteracted] = useState(false);
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const interactionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const currentItem = items[currentIndex];
  const isCurrentItemVideo = currentItem?.type === "video";

  // 🆕 슬라이드 전환 시마다 lazyCheck 실행
  useEffect(() => {
    if (onLazyCheck) {
      console.log(
        `LazyCheck triggered - Slide ${currentIndex + 1}/${items.length}`
      );
      onLazyCheck().catch((err) => console.error("LazyCheck failed:", err));
    }
  }, [currentIndex, onLazyCheck]); // currentIndex가 바뀔 때마다 실행

  // 사용자 상호작용 후 자동 재생 재개 로직
  const resetAutoPlayAfterInteraction = () => {
    setUserInteracted(true);
    setIsPlaying(false);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    if (interactionTimeoutRef.current) {
      clearTimeout(interactionTimeoutRef.current);
    }

    interactionTimeoutRef.current = setTimeout(() => {
      console.log("User interaction timeout - resuming autoplay");
      setUserInteracted(false);
      setIsPlaying(autoPlay);
    }, userInteractionTimeout);
  };

  // 자동 슬라이드 (이미지일 경우에만)
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    if (
      isPlaying &&
      items.length > 1 &&
      !isCurrentItemVideo &&
      !userInteracted
    ) {
      console.log(
        `Auto-advance timer started for image (${autoPlayInterval}ms)`
      );
      intervalRef.current = setInterval(() => {
        console.log("Auto-advancing to next slide (image timeout)");
        setCurrentIndex((prev) => (prev + 1) % items.length);
      }, autoPlayInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
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
        if (index === currentIndex && item.type === "video") {
          console.log(`Playing video: ${item.title || item.id}`);
          video.play().catch(() => {});
        } else {
          video.pause();
          video.currentTime = 0;
        }
      }
    });
  }, [currentIndex, items]);

  const goToPrevious = () => {
    console.log("User clicked previous button");
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
    resetAutoPlayAfterInteraction();
  };

  const goToNext = () => {
    console.log("User clicked next button");
    setCurrentIndex((prev) => (prev + 1) % items.length);
    resetAutoPlayAfterInteraction();
  };

  // 슬라이드 클릭 시: 닫기 + Fullscreen
  const handleSlideClick = async () => {
    console.log("User clicked slide - closing promotion");

    if (onClose) {
      onClose();
    }

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
            muted
            playsInline
            onEnded={() => {
              console.log("Video ended - advancing to next slide");
              if (items.length > 1) {
                setCurrentIndex((prev) => (prev + 1) % items.length);
                // 동영상 끝난 후 자동재생 상태 복구
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
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-2">
          {items.map((_, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                console.log(
                  `User clicked indicator - jumping to slide ${index + 1}`
                );
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
