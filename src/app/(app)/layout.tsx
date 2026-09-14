import Link from "next/link";
import { requireUser } from "@/server/auth/session";
import { SignOutButton } from "@/components/nav/sign-out-button";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <nav className="flex items-center gap-4 text-sm font-medium">
            <Link href="/board" className="font-semibold">
              Job Tracker
            </Link>
            <Link href="/documents" className="text-muted-foreground hover:text-foreground">
              Documents
            </Link>
            <Link
              href="/settings/bookmarklet"
              className="text-muted-foreground hover:text-foreground"
            >
              Bookmarklet
            </Link>
            <Link
              href="/admin/scrape-failures"
              className="text-muted-foreground hover:text-foreground"
            >
              Scrape log
            </Link>
          </nav>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>{user.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
