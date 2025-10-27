
"use client";

import { Item } from "@/app/(admin)/admin/stock/columns";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";

interface ItemCardProps {
  item: Item;
  onOrder: (item: Item) => void;
}

export function ItemCard({ item, onOrder }: ItemCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{item.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative aspect-video">
          <Image
            src={item.imageUrl || "/placeholder.svg"}
            alt={item.name}
            layout="fill"
            objectFit="cover"
            className="rounded-md"
          />
        </div>
        <p className="text-sm text-gray-500">{item.category}</p>
      </CardContent>
      <CardFooter>
        <button
          onClick={() => onOrder(item)}
          className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600"
        >
          대여하기
        </button>
      </CardFooter>
    </Card>
  );
}
