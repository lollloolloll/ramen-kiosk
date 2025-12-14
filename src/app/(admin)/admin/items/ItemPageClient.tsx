"use client";

import { useState } from "react";
// 기존 DataTable 대신 SortableDataTable import
import { SortableDataTable } from "@/components/ui/sortable-data-table";
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
import { updateItemOrder } from "@/lib/actions/item"; // 액션 import
import { toast } from "sonner";

interface ItemPageClientProps {
  initialItems: Item[];
}

export function ItemPageClient({ initialItems }: ItemPageClientProps) {
  const [showDeleted, setShowDeleted] = useState(false);

  const filteredItems = initialItems.filter((item) =>
    showDeleted ? true : !item.isDeleted
  );

  // 순서 변경 핸들러
  const handleReorder = async (newItems: Item[]) => {
    // 1. 변경된 순서대로 displayOrder 값 매핑
    const itemsToUpdate = newItems.map((item, index) => ({
      id: item.id,
      displayOrder: index, // 배열 인덱스를 순서로 저장
    }));

    // 2. 서버 액션 호출 (낙관적 업데이트는 이미 Table 내부 state로 처리됨)
    const result = await updateItemOrder(itemsToUpdate);

    if (!result.success) {
      toast.error("순서 저장에 실패했습니다.");
      // 실패 시 원래대로 돌리는 로직이 필요하다면 여기에 추가 (router.refresh() 등)
    } else {
      toast.success("아이템 순서가 변경되었습니다.");
    }
  };

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

      {/* SortableDataTable 사용 */}
      <SortableDataTable
        key={filteredItems.length} // 또는 key={JSON.stringify(data)}
        data={filteredItems}
        columns={columns}
        onReorder={handleReorder}
      />
    </div>
  );
}
