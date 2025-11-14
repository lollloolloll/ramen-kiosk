"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight } from "lucide-react";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/items", label: "Items" },
  { href: "/admin/records", label: "Records" },
  { href: "/admin/waitings", label: "Waitings" },
];

const operationLinks = [
  { href: "/admin/promotion", label: "Promotion" },
  { href: "/admin/consent", label: "Consent" },
];

export function Sidebar() {
  const pathname = usePathname();
  const [showOperationLinks, setShowOperationLinks] = useState(false);

  // Operation 하위 경로에 있는지 확인
  const isOperationActive = operationLinks.some(
    (link) => pathname === link.href
  );

  return (
    <div className="flex flex-col space-y-1">
      {links.map((link) => (
        <Button
          key={link.href}
          asChild
          variant={pathname === link.href ? "secondary" : "ghost"}
        >
          <Link href={link.href}>{link.label}</Link>
        </Button>
      ))}

      <Button
        variant={isOperationActive ? "secondary" : "ghost"}
        onClick={() => setShowOperationLinks(!showOperationLinks)}
        className="justify-center relative"
      >
        Operation
        {showOperationLinks ? (
          <ChevronDown className="h-4 w-4 absolute right-16" />
        ) : (
          <ChevronRight className="h-4 w-4 absolute right-16" />
        )}
      </Button>

      {showOperationLinks && (
        <div className="flex flex-col space-y-1">
          {operationLinks.map((link) => (
            <Button
              key={link.href}
              asChild
              variant={pathname === link.href ? "secondary" : "ghost"}
            >
              <Link href={link.href}>{link.label}</Link>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
