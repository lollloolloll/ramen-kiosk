"use client";

import { useState } from "react";
import { RamenCard } from "@/components/ramen/RamenCard";
import { Ramen } from "@/app/(admin)/admin/stock/columns";
import { RentalDialog } from "@/components/ramen/RentalDialog";

interface KioskPageClientProps {
  ramens: Ramen[];
}

export function KioskPageClient({ ramens }: KioskPageClientProps) {
  const [selectedRamen, setSelectedRamen] = useState<Ramen | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleOrder = (ramen: Ramen) => {
    setSelectedRamen(ramen);
    setIsDialogOpen(true);
    console.log("isDialogOpen set to true in KioskPageClient");
  };

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold text-center mb-10">라면 키오스크</h1>
      {ramens.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {ramens.map((ramen) => (
            <RamenCard key={ramen.id} ramen={ramen} onOrder={handleOrder} />
          ))}
        </div>
      ) : (
        <div className="text-center text-gray-500 mt-20">
          <p className="text-2xl">현재 대여 가능한 라면이 없습니다.</p>
          <p>관리자에게 문의해주세요.</p>
        </div>
      )}

      <RentalDialog
        ramen={selectedRamen}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
    </div>
  );
}
