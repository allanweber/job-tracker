"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteJob } from "@/server/actions/jobs";

export function DeleteJobButton({
  jobId,
  label,
  onDeleted,
  variant = "icon",
  className,
}: {
  jobId: string;
  label: string;
  onDeleted: () => void;
  variant?: "icon" | "button";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      try {
        await deleteJob(jobId);
        setOpen(false);
        toast.success("Job deleted");
        onDeleted();
      } catch {
        toast.error("Couldn't delete that job — please try again.");
      }
    });
  }

  return (
    <>
      {variant === "icon" ? (
        <button
          type="button"
          title="Delete"
          aria-label="Delete"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen(true);
          }}
          className={`rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive ${className ?? ""}`}
        >
          <X className="size-3.5" />
        </button>
      ) : (
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen(true);
          }}
          className={className}
        >
          Delete
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Delete this job?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {label} will be permanently removed. This can&apos;t be undone.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" disabled={pending} onClick={handleConfirm}>
              {pending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
