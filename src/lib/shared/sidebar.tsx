"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/items", label: "Items" },
  { href: "/admin/records", label: "Records" },
  { href: "/admin/waitings", label: "Waitings" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex flex-col space-y-4">
      {links.map((link) => (
        <Button
          key={link.href}
          asChild
          variant={pathname === link.href ? "secondary" : "ghost"}
        >
          <Link href={link.href}>{link.label}</Link>
        </Button>
      ))}
    </div>
  );
}
