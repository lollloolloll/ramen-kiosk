"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PromotionItem {
  id: string;
  type: "video" | "image" | "url" | "pdf"; // pdf 타입 추가됨
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
  autoPlayInterval = 10000, // 기본값 조정 (이미지/PDF 노출 시간)
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

  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentItem = items[currentIndex];
  // 비디오나 URL(유튜브 등)이 아닐 경우에만 타이머로 넘어감
  const isVideoOrExternalUrl =
    currentItem?.type === "video" || currentItem?.type === "url";

  // Lazy Check
  useEffect(() => {
    if (onLazyCheck) {
      onLazyCheck().catch((err) => console.error("LazyCheck failed:", err));
    }
  }, [currentIndex, onLazyCheck]);

  // 음소거 상태 동기화
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

  // 자동 재생 로직 (이미지, PDF인 경우 타이머 작동)
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    if (
      isPlaying &&
      items.length > 1 &&
      !isVideoOrExternalUrl && // 비디오나 유튜브는 끝났을 때 넘어가거나 자체 루프
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
    isVideoOrExternalUrl,
    userInteracted,
  ]);

  // 슬라이드 변경 시 비디오 제어
  useEffect(() => {
    items.forEach((item, index) => {
      const video = videoRefs.current[item.id];
      if (video) {
        video.muted = isMuted;
        if (index === currentIndex && item.type === "video") {
          video.currentTime = 0;
          video.play().catch(() => {});
        } else {
          video.pause();
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

  // 터치 스와이프 로직
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = e.touches[0].clientX;
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

  const getEmbedUrl = (url: string): string => {
    try {
      const urlObj = new URL(url);
      // YouTube
      if (
        urlObj.hostname.includes("youtube.com") ||
        urlObj.hostname.includes("youtu.be")
      ) {
        let videoId = "";
        if (urlObj.hostname.includes("youtu.be")) {
          videoId = urlObj.pathname.slice(1);
        } else {
          videoId = urlObj.searchParams.get("v") || "";
        }
        // loop=1 & playlist=videoId 를 추가하면 유튜브 영상 하나도 반복재생 가능
        return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=${
          isMuted ? 1 : 0
        }&loop=1&playlist=${videoId}&controls=0`;
      }
      return url;
    } catch {
      return url;
    }
  };

  if (items.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black flex items-center justify-center"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      // 클릭 시 전체화면 또는 닫기(필요에 따라 주석 해제)
      onClick={handleSlideClick}
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleMute}
        onTouchStart={handleStopPropagation}
        className="absolute top-4 right-4 z-[60] text-white hover:bg-white/20 rounded-full bg-black/30"
      >
        {isMuted ? (
          <VolumeX className="w-6 h-6" />
        ) : (
          <Volume2 className="w-6 h-6" />
        )}
      </Button>

      {/* 왼쪽 화살표 */}
      {items.length > 1 && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            goToPrevious();
          }}
          onTouchStart={handleStopPropagation}
          className="absolute left-0 top-0 w-1/6 h-full z-40 flex items-center justify-start cursor-pointer group"
        >
          <div className="ml-4 p-2 rounded-full bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
            <ChevronLeft className="w-8 h-8 text-white" />
          </div>
        </div>
      )}

      {/* 오른쪽 화살표 */}
      {items.length > 1 && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            goToNext();
          }}
          onTouchStart={handleStopPropagation}
          className="absolute right-0 top-0 w-1/6 h-full z-40 flex items-center justify-end cursor-pointer group"
        >
          <div className="mr-4 p-2 rounded-full bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
            <ChevronRight className="w-8 h-8 text-white" />
          </div>
        </div>
      )}

      {/* 콘텐츠 영역 */}
      <div className="w-full h-full flex items-center justify-center bg-black">
        {currentItem.type === "video" ? (
          <video
            ref={(el) => {
              videoRefs.current[currentItem.id] = el;
            }}
            src={currentItem.url}
            className="w-full h-full object-contain"
            muted={isMuted}
            playsInline
            autoPlay
            onEnded={() => {
              if (items.length > 1) {
                goToNext();
              } else {
                // 영상이 하나일 경우 반복 재생
                const video = videoRefs.current[currentItem.id];
                if (video) {
                  video.currentTime = 0;
                  video.play();
                }
              }
            }}
          />
        ) : currentItem.type === "url" ? (
          <iframe
            src={getEmbedUrl(currentItem.url)}
            className="w-full h-full pointer-events-none" // pointer-events-none을 넣어야 스와이프 터치가 먹힙니다. 필요시 제거.
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        ) : currentItem.type === "pdf" ? (
          // PDF 렌더링 추가
          <iframe
            src={`${currentItem.url}#view=FitH&toolbar=0&navpanes=0`}
            className="w-full h-full"
            title="PDF Viewer"
          />
        ) : (
          // 이미지
          <img
            src={currentItem.url}
            alt={currentItem.title || "홍보 이미지"}
            className="w-full h-full object-contain"
          />
        )}
      </div>

      {/* 하단 인디케이터 */}
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
              onTouchStart={handleStopPropagation}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? "bg-white w-8"
                  : "bg-white/40 hover:bg-white/60 w-2"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
