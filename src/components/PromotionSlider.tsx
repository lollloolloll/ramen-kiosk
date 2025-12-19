"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";

// 전역객체 타입 선언 (TypeScript 오류 방지)
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface PromotionItem {
  id: string;
  type: "video" | "image" | "url" | "pdf";
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
  lazyCheckInterval?: number; // 체크 주기 (기본값 60초)
}

export function PromotionSlider({
  items,
  onClose,
  autoPlay = true,
  autoPlayInterval = 10000,
  onLazyCheck,
  userInteractionTimeout = 5 * 1000,
  lazyCheckInterval = 60 * 1000, // 1분마다 체크
}: PromotionSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [userInteracted, setUserInteracted] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isApiReady, setIsApiReady] = useState(false);

  // Refs
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});
  const ytPlayerRef = useRef<any>(null); // YouTube API 인스턴스 저장
  const isMutedRef = useRef(isMuted); // ✅ isMuted의 현재값을 ref로 관리
  const intervalRef = useRef<NodeJS.Timeout | null>(null); // 슬라이드 자동 넘김용
  const interactionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const lazyCheckTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Touch handling
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentItem = items[currentIndex];
  // video나 url(유튜브)은 내부 로직으로 넘기므로 슬라이드 타이머 제외
  const isVideoOrExternalUrl =
    currentItem?.type === "video" || currentItem?.type === "url";

  // ✅ isMutedRef 동기화
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  // 1. YouTube API 스크립트 로드 (최초 1회)
  useEffect(() => {
    // 이미 로드되어 있다면 바로 true 처리
    if (window.YT && window.YT.Player) {
      setIsApiReady(true);
      return;
    }

    // 전역 콜백 함수 정의 (유튜브 API가 로드되면 이 함수를 호출함)
    window.onYouTubeIframeAPIReady = () => {
      setIsApiReady(true);
    };

    if (!document.getElementById("youtube-api-script")) {
      const tag = document.createElement("script");
      tag.id = "youtube-api-script"; // 중복 로드 방지 ID
      tag.src = "https://www.youtube.com/iframe_api"; // ✨ https:// 추가
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }, []);

  // ----------------------------------------------------------------------
  // [핵심 수정] 독립적인 Lazy Check 루프
  // 슬라이드 전환(`currentIndex`)과 무관하게 일정 주기마다 실행됨
  // ----------------------------------------------------------------------
  useEffect(() => {
    if (!onLazyCheck) return;

    // 1. 마운트 시 최초 1회 즉시 실행 (선택 사항, 필요 없으면 제거 가능)
    onLazyCheck().catch((err) =>
      console.error("Initial LazyCheck failed:", err)
    );

    // 2. 주기적 실행 설정
    lazyCheckTimerRef.current = setInterval(() => {
      // console.log("🕒 Triggering periodic lazy check (Interval)...");
      onLazyCheck().catch((err) =>
        console.error("Periodic LazyCheck failed:", err)
      );
    }, lazyCheckInterval);

    return () => {
      if (lazyCheckTimerRef.current) {
        clearInterval(lazyCheckTimerRef.current);
      }
    };
  }, [onLazyCheck, lazyCheckInterval]); // 의존성에서 currentIndex 제거됨!

  // ✅ 음소거 상태 동기화 (HTML Video + YouTube API) - 리플레이 방지
  useEffect(() => {
    // HTML Video 처리
    Object.values(videoRefs.current).forEach((video) => {
      if (video) video.muted = isMuted;
    });

    // YouTube API 처리 - 재생 중인 플레이어만 음소거 토글
    if (ytPlayerRef.current && typeof ytPlayerRef.current.mute === "function") {
      try {
        if (isMuted) {
          ytPlayerRef.current.mute();
        } else {
          ytPlayerRef.current.unMute();
        }
      } catch (e) {
        console.error("YouTube mute toggle error:", e);
      }
    }
  }, [isMuted]); // ✅ 이 useEffect는 isMuted만 감지

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

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
    resetAutoPlayAfterInteraction();
  }, [items.length, resetAutoPlayAfterInteraction]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % items.length);
    resetAutoPlayAfterInteraction();
  }, [items.length, resetAutoPlayAfterInteraction]);

  // 자동 재생 로직 (이미지, PDF인 경우 타이머 작동)
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    if (
      isPlaying &&
      items.length > 1 &&
      !isVideoOrExternalUrl &&
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

  // HTML5 Video 제어
  useEffect(() => {
    items.forEach((item, index) => {
      const video = videoRefs.current[item.id];
      if (video) {
        video.muted = isMutedRef.current;
        if (index === currentIndex && item.type === "video") {
          video.currentTime = 0;
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      }
    });
  }, [currentIndex, items]);

  // YouTube IFrame API 제어 로직
  useEffect(() => {
    // 1. 기존 플레이어 정리
    if (ytPlayerRef.current) {
      try {
        ytPlayerRef.current.destroy(); // 메모리 누수 방지 및 오디오 겹침 방지
      } catch (e) {
        // ignore
      }
      ytPlayerRef.current = null;
    }

    // 2. 현재 아이템이 YouTube URL인지 확인
    if (currentItem?.type === "url") {
      const videoId = extractYouTubeId(currentItem.url);

      if (videoId && window.YT && window.YT.Player) {
        // API 초기화
        const createPlayer = () => {
          // React의 ref div 요소에 플레이어를 생성합니다.
          ytPlayerRef.current = new window.YT.Player(`youtube-player-div`, {
            height: "100%",
            width: "100%",
            videoId: videoId,
            playerVars: {
              autoplay: 1,
              controls: 0, // 컨트롤 바 숨김 (조작 방지 1)
              disablekb: 1, // 키보드 조작 방지 (조작 방지 2)
              fs: 0,
              rel: 0,
              playsinline: 1,
            },
            events: {
              onReady: (event: any) => {
                // ✅ ref의 현재값 사용 (리플레이 방지)
                if (isMutedRef.current) event.target.mute();
                else event.target.unMute();

                event.target.playVideo();
              },
              onStateChange: (event: any) => {
                // YT.PlayerState.ENDED === 0
                if (event.data === 0) {
                  // console.log("✅ YouTube Ended (API Event)! Moving next...");
                  if (items.length > 1) {
                    goToNext();
                  } else {
                    // 아이템이 하나면 반복 재생
                    event.target.playVideo();
                  }
                }
              },
            },
          });
        };

        createPlayer();
      }
    }
  }, [currentIndex, currentItem, items.length, goToNext, isApiReady]); // ✅ isMuted 제거!

  // YouTube ID 추출 헬퍼 함수
  const extractYouTubeId = (url: string) => {
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname.includes("youtu.be")) {
        return urlObj.pathname.slice(1).split("?")[0];
      }
      if (urlObj.hostname.includes("youtube.com")) {
        return urlObj.searchParams.get("v");
      }
    } catch (e) {
      return null;
    }
    return null;
  };

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
      // console.log("Fullscreen request failed:", err);
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
      onClick={handleSlideClick}
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleMute}
        onTouchStart={handleStopPropagation}
        className="absolute top-4 right-4 z-60 text-white hover:bg-white/20 rounded-full bg-black/30"
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
                const video = videoRefs.current[currentItem.id];
                if (video) {
                  video.currentTime = 0;
                  video.play();
                }
              }
            }}
          />
        ) : currentItem.type === "url" ? (
          <div className="relative w-full h-full">
            <div
              className="absolute inset-0 z-10"
              style={{ cursor: "pointer" }}
            />
            <div
              id="youtube-player-div"
              className="w-full h-full pointer-events-none" // CSS로도 조작 방지
            />
          </div>
        ) : currentItem.type === "pdf" ? (
          <iframe
            src={`${currentItem.url}#view=FitH&toolbar=0&navpanes=0`}
            className="w-full h-full"
            title="PDF Viewer"
          />
        ) : (
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
