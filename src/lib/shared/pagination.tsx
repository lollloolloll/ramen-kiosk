"use client";

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DoubleArrowLeftIcon,
  DoubleArrowRightIcon,
} from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter, useSearchParams } from "next/navigation";

interface PaginationProps {
  page: number;
  per_page: number;
  total_count: number;
}

export function Pagination({ page, per_page, total_count }: PaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const total_pages = Math.ceil(total_count / per_page) || 1;

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > total_pages) return;
    const params = new URLSearchParams(searchParams);
    params.set("page", newPage.toString());
    router.push(`?${params.toString()}`);
  };

  const handlePerPageChange = (value: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("per_page", value);
    params.set("page", "1");
    router.push(`?${params.toString()}`);
  };

  const getPageNumbers = () => {
    const pageNumbers = [];
    const displayPages = 10;
    const pageGroup = Math.ceil(page / displayPages);
    let startPage = (pageGroup - 1) * displayPages + 1;
    let endPage = startPage + displayPages - 1;

    if (endPage > total_pages) {
      endPage = total_pages;
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }
    return pageNumbers;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex items-center justify-between px-2">
      <div className="flex-1 text-sm text-muted-foreground">
        Total {total_count} row(s).
      </div>
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          className="hidden h-8 w-8 p-0 lg:flex"
          onClick={() => handlePageChange(1)}
          disabled={page === 1}
        >
          <span className="sr-only">Go to first page</span>
          <DoubleArrowLeftIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          className="h-8 w-8 p-0"
          onClick={() => handlePageChange(page - 1)}
          disabled={page === 1}
        >
          <span className="sr-only">Go to previous page</span>
          <ChevronLeftIcon className="h-4 w-4" />
        </Button>
        {pageNumbers.map((p) => (
          <Button
            key={p}
            variant={page === p ? "default" : "outline"}
            className="h-8 w-8 p-0"
            onClick={() => handlePageChange(p)}
          >
            {p}
          </Button>
        ))}
        <Button
          variant="outline"
          className="h-8 w-8 p-0"
          onClick={() => handlePageChange(page + 1)}
          disabled={page === total_pages}
        >
          <span className="sr-only">Go to next page</span>
          <ChevronRightIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          className="hidden h-8 w-8 p-0 lg:flex"
          onClick={() => handlePageChange(total_pages)}
          disabled={page === total_pages}
        >
          <span className="sr-only">Go to last page</span>
          <DoubleArrowRightIcon className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex flex-1 items-center justify-end space-x-2">
        <p className="text-sm font-medium">Rows per page</p>
        <Select
          value={`${per_page}`}
          onValueChange={(value) => handlePerPageChange(value)}
        >
          <SelectTrigger className="h-8 w-[70px]">
            <SelectValue placeholder={`${per_page}`} />
          </SelectTrigger>
          <SelectContent side="top">
            {[10, 20, 30, 40, 50].map((pageSize) => (
              <SelectItem key={pageSize} value={`${pageSize}`}>
                {pageSize}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}