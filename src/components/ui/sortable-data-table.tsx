"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  Row,
} from "@tanstack/react-table";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface SortableDataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  onReorder: (newOrder: TData[]) => void;
}

// 드래그 가능한 행 컴포넌트
function SortableRow({ row }: { row: Row<any> }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: row.original.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    position: isDragging ? ("relative" as const) : undefined,
  } as React.CSSProperties;

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      data-state={row.getIsSelected() && "selected"}
      className={isDragging ? "bg-muted/50 opacity-50" : ""}
    >
      {row.getVisibleCells().map((cell) => {
        // drag-handle 컬럼인지 확인
        const isDragHandle = cell.column.id === "drag-handle";

        return (
          <TableCell key={cell.id}>
            {flexRender(cell.column.columnDef.cell, {
              ...cell.getContext(),
              // 👇 drag-handle 컬럼에만 props 전달
              ...(isDragHandle
                ? { dragHandleProps: { ...attributes, ...listeners } }
                : {}),
            } as any)}
          </TableCell>
        );
      })}
    </TableRow>
  );
}

export function SortableDataTable<
  TData extends { id: number | string },
  TValue
>({ columns, data, onReorder }: SortableDataTableProps<TData, TValue>) {
  const [items, setItems] = useState<TData[]>(data);

  // 🔥 드래그 중인지 추적
  const isDraggingRef = useRef(false);

  // 🔥 드래그 중이 아닐 때만 외부 data 동기화
  useEffect(() => {
    if (!isDraggingRef.current) {
      setItems(data);
    }
  }, [data]);

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    isDraggingRef.current = false; // 🔥 드래그 종료

    if (over && active.id !== over.id) {
      setItems((currentItems) => {
        const oldIndex = currentItems.findIndex(
          (item) => item.id === active.id
        );
        const newIndex = currentItems.findIndex((item) => item.id === over.id);

        const newOrder = arrayMove(currentItems, oldIndex, newIndex);

        onReorder(newOrder);
        return newOrder;
      });
    }
  }

  function handleDragStart() {
    isDraggingRef.current = true; // 🔥 드래그 시작
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            <SortableContext
              items={items.map((item) => item.id)}
              strategy={verticalListSortingStrategy}
            >
              {table.getRowModel().rows?.length ? (
                table
                  .getRowModel()
                  .rows.map((row) => <SortableRow key={row.id} row={row} />)
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </SortableContext>
          </TableBody>
        </Table>
      </div>
    </DndContext>
  );
}
