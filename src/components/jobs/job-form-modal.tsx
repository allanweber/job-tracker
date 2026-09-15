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
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto sm:max-w-2xl">
        <DialogHeader className="flex-row items-center justify-between gap-2 space-y-0">
          <DialogTitle>{title}</DialogTitle>
          {headerActions && <div className="mr-6 flex items-center gap-2">{headerActions}</div>}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
