"use client";

import { Item } from "@/app/(admin)/admin/items/columns";
import { Card } from "@/components/ui/card";
import Image from "next/image";

interface ItemCardProps {
  item: Item;
  onOrder: (item: Item) => void;
}

export function ItemCard({ item, onOrder }: ItemCardProps) {
  return (
    <Card
      // 테두리 색상에 실제 색상 값 적용
      className="overflow-hidden cursor-pointer transition-all hover:shadow-2xl hover:scale-[1.03] active:scale-[0.98] border-2 border-[oklch(0.75_0.12_165/0.2)] hover:border-[oklch(0.75_0.12_165/0.4)] bg-card"
      onClick={() => onOrder(item)}
    >
      {/* 이미지 영역 배경 그라데이션에 실제 색상 값 적용 */}
      <div className="relative aspect-square bg-gradient-to-br from-[oklch(0.75_0.12_165/0.1)] via-[oklch(0.7_0.18_350/0.1)] to-[oklch(0.7_0.18_350/0.1)]">
        <Image
          src={item.imageUrl || "/placeholder.svg"}
          alt={item.name}
          fill
          className="object-cover"
        />
      </div>

      {/* 상품명 영역 배경 그라데이션에 실제 색상 값 적용 */}
      <div className="p-4 bg-gradient-to-r from-[oklch(0.75_0.12_165/0.05)] to-[oklch(0.7_0.18_350/0.05)]">
        {/* text-foreground는 기존 변수를 유지하거나, 필요시 text-[oklch(0.2_0.02_250)]로 변경 가능 */}
        <h3 className="text-lg font-bold text-center line-clamp-2 text-foreground">
          {item.name}
        </h3>
      </div>
    </Card>
  );
}