"use client";

import { Badge } from "@/components/ui/badge";
import { Item } from "@/app/(admin)/admin/items/columns";
import { Card } from "@/components/ui/card";
import Image from "next/image";
import bearImage from "@/assets/images/bear.png";
import { Ban } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatAutoHideRestriction } from "@/lib/item-availability";

interface ItemCardProps {
  item: Item;
  onOrder: (item: Item) => void;
}

export function ItemCard({ item, onOrder }: ItemCardProps) {
  const isRented = item.isTimeLimited ? item.status === "RENTED" : false;
  const isAutoHidden = Boolean(item.isAutoHidden && item.activeAutoHideSchedule);
  const waitingCount = item.waitingCount;
  const restrictionText = item.activeAutoHideSchedule
    ? formatAutoHideRestriction(item.activeAutoHideSchedule)
    : null;

  return (
    <Card
      // flex flex-col 추가하여 자식 요소들을 수직으로 정렬
      className={cn(
        "relative flex flex-col overflow-hidden border-2 bg-card pt-4 transition-all",
        isAutoHidden
          ? "cursor-not-allowed border-slate-300 bg-slate-100/90 shadow-sm"
          : "cursor-pointer border-[oklch(0.75_0.12_165/0.2)] hover:border-[oklch(0.75_0.12_165/0.4)] hover:shadow-2xl hover:scale-[1.03] active:scale-[0.98]"
      )}
      aria-disabled={Boolean(isAutoHidden)}
      onClick={() => {
        if (isAutoHidden) return;
        onOrder(item);
      }}
    >
      <div className="absolute top-2 right-2 z-10">
        <Badge
          variant={isAutoHidden ? "outline" : isRented ? "rented" : "available"}
          className={cn(
            isAutoHidden && "border-slate-400 bg-slate-700 text-white"
          )}
        >
          {isAutoHidden ? "이용 제한" : isRented ? "대여 중" : "대여 가능"}
          {!isAutoHidden && waitingCount > 0 && ` (${waitingCount}팀 대기)`}
        </Badge>
      </div>
      {/* 이미지 영역: 이제 정상적으로 상단에 위치 */}
      <div
        className={cn(
          "relative aspect-square bg-linear-to-br from-[oklch(0.75_0.12_165/0.1)] via-[oklch(0.7_0.18_350/0.1)] to-[oklch(0.7_0.18_350/0.1)]",
          isAutoHidden && "bg-slate-200"
        )}
      >
        <Image
          src={item.imageUrl || bearImage}
          alt={item.name}
          fill
          className={cn("object-cover", isAutoHidden && "grayscale opacity-45")}
        />
        {isAutoHidden && restrictionText && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/35 px-4 text-center text-white">
            <div className="flex size-16 items-center justify-center rounded-full border-4 border-white/90 bg-slate-900/75">
              <Ban className="size-9" />
            </div>
            <div className="rounded-md bg-slate-950/75 px-3 py-2 shadow-lg">
              <p className="text-lg font-black">지금 이용 불가</p>
              <p className="text-sm font-bold">{restrictionText}</p>
            </div>
          </div>
        )}
      </div>

      {/* 상품명 영역: 이미지 영역 아래에 위치 */}
      <div
        className={cn(
          "p-4 bg-linear-to-r from-[oklch(0.75_0.12_165/0.05)] to-[oklch(0.7_0.18_350/0.05)]",
          isAutoHidden && "from-slate-100 to-slate-100"
        )}
      >
        <h3
          className={cn(
            "text-lg font-bold text-center line-clamp-2 text-foreground",
            isAutoHidden && "text-slate-500"
          )}
        >
          {item.name}
        </h3>
      </div>
    </Card>
  );
}
