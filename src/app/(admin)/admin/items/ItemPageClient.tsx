"use client";

import { DataTable } from "@/components/ui/data-table";
import { Item, columns } from "./columns";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AddItemForm } from "./AddItemForm";

interface ItemPageClientProps {
  initialItems: Item[];
}

export function ItemPageClient({ initialItems }: ItemPageClientProps) {
  return (
    <div className="container px-16 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">아이템 재고 관리</h1>
        <Dialog>
          <DialogTrigger asChild>
            <Button>아이템 추가</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>아이템 추가</DialogTitle>
            </DialogHeader>
            <AddItemForm />
          </DialogContent>
        </Dialog>
      </div>
      <DataTable columns={columns} data={initialItems} />
    </div>
  );
}
