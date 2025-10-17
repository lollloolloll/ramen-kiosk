"use client";

import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createRamen, updateRamen, deleteRamen } from "@/lib/actions/ramen";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

// Keep interfaces and schemas here
interface Ramen {
  id: string;
  name: string;
  manufacturer: string;
  stock: number;
  imageUrl: string | null;
}

const ramenFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  manufacturer: z.string().min(1, "Manufacturer is required"),
  stock: z.coerce.number().int().min(0, "Stock cannot be negative"),
  imageUrl: z.string().url("Invalid image URL").nullable().optional(),
});

type RamenFormData = z.infer<typeof ramenFormSchema>;

// Actions Cell Component to fix hook issue
const RamenActions = ({ ramen }: { ramen: Ramen }) => {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const {
    register: editRegister,
    handleSubmit: handleEditSubmit,
    formState: { errors: editErrors, isSubmitting: isEditSubmitting },
    reset: editReset,
  } = useForm({
    resolver: zodResolver(ramenFormSchema),
    defaultValues: {
      name: ramen.name,
      manufacturer: ramen.manufacturer,
      stock: ramen.stock,
      imageUrl: ramen.imageUrl || "",
    },
  });

  const onEditSubmit = async (data: RamenFormData) => {
    const formData = new FormData();
    formData.append("name", data.name);
    formData.append("manufacturer", data.manufacturer);
    formData.append("stock", data.stock.toString());
    if (data.imageUrl) formData.append("imageUrl", data.imageUrl);

    const result = await updateRamen(ramen.id, formData);
    if (result?.success) {
      toast.success("Ramen updated successfully!");
      setIsEditDialogOpen(false);
    } else {
      toast.error(result?.error || "Failed to update ramen.");
    }
  };

  const onDelete = async () => {
    const result = await deleteRamen(ramen.id);
    if (result?.success) {
      toast.success("Ramen deleted successfully!");
      setIsDeleteDialogOpen(false);
    } else {
      toast.error(result?.error || "Failed to delete ramen.");
    }
  };

  return (
    <div className="flex space-x-2">
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              editReset({
                name: ramen.name,
                manufacturer: ramen.manufacturer,
                stock: ramen.stock,
                imageUrl: ramen.imageUrl || "",
              })
            }
          >
            Edit
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Ramen</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleEditSubmit(onEditSubmit)}
            className="grid gap-4 py-4"
          >
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                {...editRegister("name")}
                className="col-span-3"
              />
              {editErrors.name && (
                <p className="col-span-4 text-red-500 text-sm">
                  {editErrors.name.message}
                </p>
              )}
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="manufacturer" className="text-right">
                Manufacturer
              </Label>
              <Input
                id="manufacturer"
                {...editRegister("manufacturer")}
                className="col-span-3"
              />
              {editErrors.manufacturer && (
                <p className="col-span-4 text-red-500 text-sm">
                  {editErrors.manufacturer.message}
                </p>
              )}
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="stock" className="text-right">
                Stock
              </Label>
              <Input
                id="stock"
                type="number"
                {...editRegister("stock", { valueAsNumber: true })}
                className="col-span-3"
              />
              {editErrors.stock && (
                <p className="col-span-4 text-red-500 text-sm">
                  {editErrors.stock.message}
                </p>
              )}
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="imageUrl" className="text-right">
                Image URL
              </Label>
              <Input
                id="imageUrl"
                {...editRegister("imageUrl")}
                className="col-span-3"
              />
              {editErrors.imageUrl && (
                <p className="col-span-4 text-red-500 text-sm">
                  {editErrors.imageUrl.message}
                </p>
              )}
            </div>
            <Button type="submit" disabled={isEditSubmitting}>
              {isEditSubmitting ? "Saving..." : "Save changes"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="destructive" size="sm">
            Delete
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to delete "{ramen.name}"?</p>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={onDelete}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const columns: ColumnDef<Ramen>[] = [
  {
    accessorKey: "imageUrl",
    header: "Image",
    cell: ({ row }) =>
      row.original.imageUrl ? (
        <Image
          src={row.original.imageUrl}
          alt={row.original.name}
          width={50}
          height={50}
          className="rounded-md object-cover"
        />
      ) : (
        <div className="w-12 h-12 bg-gray-200 rounded-md flex items-center justify-center text-sm text-gray-500">
          No Image
        </div>
      ),
  },
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "manufacturer",
    header: "Manufacturer",
  },
  {
    accessorKey: "stock",
    header: "Stock",
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => <RamenActions ramen={row.original} />,
  },
];

export function StockPageClient({ initialRamens }: { initialRamens: Ramen[] }) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const {
    register: addRegister,
    handleSubmit: handleAddSubmit,
    formState: { errors: addErrors, isSubmitting: isAddSubmitting },
    reset: addReset,
  } = useForm({
    resolver: zodResolver(ramenFormSchema),
    defaultValues: {
      name: "",
      manufacturer: "",
      stock: 0,
      imageUrl: "",
    },
  });

  const onAddSubmit = async (data: RamenFormData) => {
    const formData = new FormData();
    formData.append("name", data.name);
    formData.append("manufacturer", data.manufacturer);
    formData.append("stock", data.stock.toString());
    if (data.imageUrl) formData.append("imageUrl", data.imageUrl);

    const result = await createRamen(formData);
    if (result?.success) {
      toast.success("Ramen added successfully!");
      setIsAddDialogOpen(false);
      addReset();
    } else {
      toast.error(result?.error || "Failed to add ramen.");
    }
  };

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Ramen Inventory</h2>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => addReset()}>Add New Ramen</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Ramen</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={handleAddSubmit(onAddSubmit)}
              className="grid gap-4 py-4"
            >
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input
                  id="name"
                  {...addRegister("name")}
                  className="col-span-3"
                />
                {addErrors.name && (
                  <p className="col-span-4 text-red-500 text-sm">
                    {addErrors.name.message}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="manufacturer" className="text-right">
                  Manufacturer
                </Label>
                <Input
                  id="manufacturer"
                  {...addRegister("manufacturer")}
                  className="col-span-3"
                />
                {addErrors.manufacturer && (
                  <p className="col-span-4 text-red-500 text-sm">
                    {addErrors.manufacturer.message}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="stock" className="text-right">
                  Stock
                </Label>
                <Input
                  id="stock"
                  type="number"
                  {...addRegister("stock", { valueAsNumber: true })}
                  className="col-span-3"
                />
                {addErrors.stock && (
                  <p className="col-span-4 text-red-500 text-sm">
                    {addErrors.stock.message}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="imageUrl" className="text-right">
                  Image URL
                </Label>
                <Input
                  id="imageUrl"
                  {...addRegister("imageUrl")}
                  className="col-span-3"
                />
                {addErrors.imageUrl && (
                  <p className="col-span-4 text-red-500 text-sm">
                    {addErrors.imageUrl.message}
                  </p>
                )}
              </div>
              <Button type="submit" disabled={isAddSubmitting}>
                {isAddSubmitting ? "Adding..." : "Add Ramen"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <DataTable columns={columns} data={initialRamens} />
    </div>
  );
}
