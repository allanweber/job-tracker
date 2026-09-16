import { requireUser } from "@/server/auth/session";
import { NavLinks } from "@/components/nav/nav-links";
import { SignOutButton } from "@/components/nav/sign-out-button";

export default async function AppLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between gap-4 px-5 py-3.5">
          <NavLinks />
          <div className="flex min-w-0 items-center gap-3.5 text-sm text-muted-foreground">
            <span className="hidden truncate sm:inline">{user.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1100px] flex-1 px-5 py-6">{children}</main>
      {modal}
    </div>
  );
}
