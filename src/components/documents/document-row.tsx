"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getDocumentDownloadUrl, deleteDocument } from "@/server/actions/documents";
import type { documents } from "@/server/db/schema";

const KIND_LABELS: Record<string, string> = {
  resume: "Resume",
  cover_letter: "Cover letter",
  other: "Other",
};

export function DocumentRow({ document }: { document: typeof documents.$inferSelect }) {
  const router = useRouter();

  async function handleView() {
    try {
      const url = await getDocumentDownloadUrl(document.id);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("Couldn't get a link for this file.");
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${document.filename}"? Jobs referencing it will keep the reference blank.`))
      return;
    await deleteDocument(document.id);
    router.refresh();
  }

  return (
    <div className="flex items-center justify-between gap-4 p-3">
      <div className="flex items-center gap-3">
        <Badge variant="outline">{KIND_LABELS[document.kind] ?? document.kind}</Badge>
        <span className="text-sm">{document.filename}</span>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="ghost" onClick={handleView}>
          View
        </Button>
        <Button size="sm" variant="ghost" onClick={handleDelete}>
          Delete
        </Button>
      </div>
    </div>
  );
}
