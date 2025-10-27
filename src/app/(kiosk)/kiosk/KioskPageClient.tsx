"use client";

import { useState } from "react";
import { ItemCard } from "@/components/item/ItemCard";
import { Item } from "@/app/(admin)/admin/stock/columns";
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
    <div className="container px-16 py-10">
      <h1 className="text-3xl font-bold text-center mb-10">쉬다 대여 목록</h1>
      {items.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} onOrder={handleOrder} />
          ))}
        </div>
      ) : (
        <div className="text-center text-gray-500 mt-20">
          <p className="text-2xl">현재 대여가능한 상품이 없습니다.</p>
          <p>관리자에게 문의해주세요.</p>
        </div>
      )}

      <RentalDialog
        item={selectedItem}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
    </div>
  );
}
