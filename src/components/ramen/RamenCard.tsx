"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Ramen } from "@/app/(admin)/admin/stock/columns";

interface RamenCardProps {
  ramen: Ramen;
  onOrder: (ramen: Ramen) => void;
}

export function RamenCard({ ramen, onOrder }: RamenCardProps) {
  return (
    <div className="border rounded-lg p-4 flex flex-col items-center">
      <div className="relative w-full h-40 mb-4">
        <Image
          src={ramen.imageUrl || "/file.svg"} // Placeholder image
          alt={ramen.name}
          fill
          style={{ objectFit: "contain" }}
        />
      </div>
      <h3 className="font-bold text-lg">{ramen.name}</h3>
      <p className="text-sm text-gray-500">{ramen.manufacturer}</p>
      <p className="text-lg font-semibold my-2">
        {ramen.stock > 0 ? `${ramen.stock}개 남음` : "재고 없음"}
      </p>
      <Button onClick={() => onOrder(ramen)} disabled={ramen.stock === 0}>
        {ramen.stock > 0 ? "대여하기" : "재고 없음"}
      </Button>
    </div>
  );
}
