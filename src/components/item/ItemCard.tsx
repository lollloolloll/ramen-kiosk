"use client";

import { Badge } from "@/components/ui/badge";
import { Item } from "@/app/(admin)/admin/items/columns";
import { Card } from "@/components/ui/card";
import Image from "next/image";

interface ItemCardProps {
  item: Item;
  onOrder: (item: Item) => void;
}

export function ItemCard({ item, onOrder }: ItemCardProps) {
  const isRented = item.isTimeLimited ? item.status === "RENTED" : false;
  const waitingCount = item.waitingCount;

  return (
    <Card
      // flex flex-col 추가하여 자식 요소들을 수직으로 정렬
      className="relative flex flex-col overflow-hidden cursor-pointer transition-all hover:shadow-2xl hover:scale-[1.03] active:scale-[0.98] border-2 border-[oklch(0.75_0.12_165/0.2)] hover:border-[oklch(0.75_0.12_165/0.4)] bg-card pt-4"
      onClick={() => onOrder(item)}
    >
      <div className="absolute top-2 right-2 z-10">
        <Badge variant={isRented ? "rented" : "available"}>
          {isRented ? "대여 중" : "대여 가능"}
          {waitingCount > 0 && ` (${waitingCount}팀 대기)`}
        </Badge>
      </div>
      {/* 이미지 영역: 이제 정상적으로 상단에 위치 */}
      <div className="relative aspect-square bg-linear-to-br from-[oklch(0.75_0.12_165/0.1)] via-[oklch(0.7_0.18_350/0.1)] to-[oklch(0.7_0.18_350/0.1)]">
        <Image
          src={item.imageUrl || "/placeholder.svg"}
          alt={item.name}
          fill
          className="object-cover"
        />
      </div>

      {/* 상품명 영역: 이미지 영역 아래에 위치 */}
      <div className="p-4 bg-linear-to-r from-[oklch(0.75_0.12_165/0.05)] to-[oklch(0.7_0.18_350/0.05)]">
        <h3 className="text-lg font-bold text-center line-clamp-2 text-foreground">
          {item.name}
        </h3>
      </div>
    </Card>
  );
}
