"use client";

import { useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface ItemPageClientProps {
  initialItems: Item[];
}

export function ItemPageClient({ initialItems }: ItemPageClientProps) {
  const [showDeleted, setShowDeleted] = useState(false);

  const filteredItems = initialItems.filter((item) =>
    showDeleted ? true : !item.isDeleted
  );

  return (
    <div className="container px-16 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">아이템 관리</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="show-deleted"
              checked={showDeleted}
              onCheckedChange={setShowDeleted}
            />
            <Label htmlFor="show-deleted">삭제된 아이템 보기</Label>
          </div>
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
      </div>
      <DataTable columns={columns} data={filteredItems} />
    </div>
  );
}
