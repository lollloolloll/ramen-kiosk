"use client";

import { useState } from "react";
import { ItemCard } from "@/components/item/ItemCard";
import { Item } from "@/app/(admin)/admin/items/columns";
import { RentalDialog } from "@/components/item/RentalDialog";

interface KioskPageClientProps {
  items: Item[];
}

export function KioskPageClient({ items }: KioskPageClientProps) {
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleOrder = (item: Item) => {
    setSelectedItem(item);
    setIsDialogOpen(true);
    console.log("isDialogOpen set to true in KioskPageClient");
  };

  return (
    // 배경 그라데이션에 실제 색상 값 적용
    <div className="min-h-screen bg-gradient-to-br from-[oklch(0.75_0.12_165/0.05)] via-[oklch(0.7_0.18_350/0.05)] to-[oklch(0.7_0.18_350/0.05)]">
      <div className="container px-28 py-">
        <div className="mb-12 text-center">
          {/* 제목 텍스트 색상에 실제 색상 값 적용 */}
          <h1 className="text-5xl font-black text-[oklch(0.75_0.12_165)] mb-4">
            쉬다 대여 목록
          </h1>
          {/* 제목 밑줄 그라데이션에 실제 색상 값 적용 */}
          <div className="h-1.5 w-32 mx-auto bg-gradient-to-r from-[oklch(0.75_0.12_165)] via-[oklch(0.7_0.18_350)] to-[oklch(0.7_0.18_350)] rounded-full" />
        </div>

        {items.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {items.map((item) => (
              <ItemCard key={item.id} item={item} onOrder={handleOrder} />
            ))}
          </div>
        ) : (
          // '상품 없음' 영역의 테두리 및 텍스트 색상에 실제 값 적용
          // bg-card와 같은 기존 shadcn/ui 변수는 유지
          <div className="text-center mt-20 bg-card rounded-2xl p-12 shadow-lg border-2 border-[oklch(0.75_0.12_165/0.2)]">
            <p className="text-3xl font-bold text-[oklch(0.75_0.12_165)] mb-2">
              현재 대여가능한 상품이 없습니다.
            </p>
            {/* text-muted-foreground는 기존 변수를 유지하거나, 필요시 text-[oklch(0.5_0.02_250)]로 변경 가능 */}
            <p className="text-lg text-muted-foreground">
              관리자에게 문의해주세요.
            </p>
          </div>
        )}

        <RentalDialog
          item={selectedItem}
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
        />
      </div>
    </div>
  );
}
