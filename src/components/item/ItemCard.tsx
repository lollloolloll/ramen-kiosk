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
      className="overflow-hidden cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
      onClick={() => onOrder(item)}
    >
      {/* 이미지 영역 */}
      <div className="relative aspect-square bg-gray-100">
        <Image
          src={item.imageUrl || "/placeholder.svg"}
          alt={item.name}
          fill
          className="object-cover"
        />
      </div>

      {/* 상품명 영역 */}
      <div className="p-4 bg-white">
        <h3 className="text-lg font-bold text-center line-clamp-2">
          {item.name}
        </h3>
      </div>
    </Card>
  );
}
