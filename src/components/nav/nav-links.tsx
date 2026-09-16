"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
    </nav>
  );
}
