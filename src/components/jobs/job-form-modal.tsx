"use client";

import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function JobFormModal({
  title,
  headerActions,
  children,
}: {
  title: string;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) router.back();
      }}
    >
      {/* `flex flex-col` + `p-0` here, with padding pushed onto the header
          and body instead: the header needs to stay put as a fixed bar
          while only the body scrolls, so it can't share a single scrolling
          box with the content the way `DialogContent`'s default padding
          assumes. */}
      <DialogContent className="flex max-h-[85vh] w-full max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="flex-row shrink-0 items-center justify-between gap-2 space-y-0 rounded-t-xl border-b bg-muted/40 px-5 py-4">
          <DialogTitle>{title}</DialogTitle>
          {headerActions && <div className="mr-8 flex items-center gap-2">{headerActions}</div>}
        </DialogHeader>
        <div className="overflow-y-auto p-5">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
