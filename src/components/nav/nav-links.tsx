"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const LINKS = [
  { href: "/documents", label: "Documents" },
  { href: "/settings/bookmarklet", label: "Bookmarklet" },
  { href: "/admin/scrape-failures", label: "Scrape log" },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-[22px] text-sm font-medium">
      <Link href="/board" className="text-[15px] font-semibold">
        Job Tracker
      </Link>

      <div className="hidden items-center gap-[22px] sm:flex">
        {LINKS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={
              pathname.startsWith(href)
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }
          >
            {label}
          </Link>
        ))}
      </div>

      <Popover>
        <PopoverTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              className="sm:hidden"
              aria-label="Open navigation menu"
            />
          }
        >
          <Menu className="size-4.5" />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-56 p-1.5">
          <div className="flex flex-col">
            {LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`flex h-11 items-center rounded-md px-3 text-sm ${
                  pathname.startsWith(href)
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </nav>
  );
}
