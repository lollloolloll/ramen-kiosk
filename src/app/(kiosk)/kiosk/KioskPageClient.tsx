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
    // 그라데이션 투명도를 0.05 → 0.15로 증가
    <div className="min-h-screen bg-gradient-to-br from-[oklch(0.75_0.12_165/0.15)] via-[oklch(0.7_0.18_350/0.15)] to-[oklch(0.7_0.18_350/0.15)]">
      <div className="container px-28 py-10">
        <div className="mb-12 text-center">
          <h1 className="text-5xl font-black text-[oklch(0.75_0.12_165)] mb-4">
            쉬다 대여 목록
          </h1>
          <div className="h-1.5 w-32 mx-auto bg-gradient-to-r from-[oklch(0.75_0.12_165)] via-[oklch(0.7_0.18_350)] to-[oklch(0.7_0.18_350)] rounded-full" />
        </div>

        {items.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {items.map((item) => (
              <ItemCard key={item.id} item={item} onOrder={handleOrder} />
            ))}
          </div>
        ) : (
          <div className="text-center mt-20 bg-card rounded-2xl p-12 shadow-lg border-2 border-[oklch(0.75_0.12_165/0.2)]">
            <p className="text-3xl font-bold text-[oklch(0.75_0.12_165)] mb-2">
              현재 대여가능한 상품이 없습니다.
            </p>
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
