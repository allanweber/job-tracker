"use client";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { ImportError } from "@/server/import-export/job-csv";

/** Shown after a CSV import that skipped one or more rows, so nothing fails
 * silently — every skipped row and why is listed by its line number in the
 * uploaded file. */
export function ImportResultsDialog({
  errors,
  onClose,
}: {
  errors: ImportError[] | null;
  onClose: () => void;
}) {
  const open = errors !== null && errors.length > 0;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {errors?.length} row{errors?.length === 1 ? "" : "s"} skipped
          </DialogTitle>
        </DialogHeader>
        <ul className="flex max-h-64 flex-col gap-2 overflow-y-auto text-sm">
          {errors?.map((err) => (
            <li key={err.row} className="rounded-md border p-2">
              <span className="font-medium">Row {err.row}: </span>
              <span className="text-muted-foreground">{err.reason}</span>
            </li>
          ))}
        </ul>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
