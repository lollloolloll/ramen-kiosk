"use client";

import { DataTable } from "@/components/ui/data-table";
import { Ramen, columns } from "./columns";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AddRamenForm } from "./AddRamenForm";

interface StockPageClientProps {
  initialRamens: Ramen[];
}

export function StockPageClient({ initialRamens }: StockPageClientProps) {
  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Ramen Stock Management</h1>
        <Dialog>
          <DialogTrigger asChild>
            <Button>라면 추가</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>라면 수정</DialogTitle>
            </DialogHeader>
            <AddRamenForm />
          </DialogContent>
        </Dialog>
      </div>
      <DataTable columns={columns} data={initialRamens} />
    </div>
  );
}
