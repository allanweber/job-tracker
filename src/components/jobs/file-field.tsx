"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { FileIcon, UploadIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { uploadDocument } from "@/lib/upload-document";
import { getDocumentDownloadUrl } from "@/server/actions/documents";
import type { documents } from "@/server/db/schema";

type Doc = typeof documents.$inferSelect;

/**
 * Resume/cover-letter field for the job form: shows the currently attached
 * file (if any) with a way to view or remove it, and — when nothing's
 * attached — a drag-and-drop dropzone (also clickable) to upload a new file
 * on the spot, plus a "Choose existing file" button that opens a modal
 * listing previously-uploaded files of this kind to pick from instead.
 */
export function FileField({
  label,
  kind,
  documents: docs,
  value,
  onChange,
}: {
  label: string;
  kind: "resume" | "cover_letter";
  documents: Doc[];
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  // Seeded from the server-fetched list, then grown locally as files are
  // uploaded here — so a just-uploaded file shows up as "selected" and in
  // the browse modal immediately, without needing a full page reload.
  const [knownDocs, setKnownDocs] = useState(docs);
  const [browseOpen, setBrowseOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const options = knownDocs.filter((d) => d.kind === kind || d.kind === "other");
  const selected = knownDocs.find((d) => d.id === value) ?? null;

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const doc = await uploadDocument(file, kind);
      setKnownDocs((prev) => [doc, ...prev]);
      onChange(doc.id);
      toast.success(`${file.name} uploaded`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) void handleUpload(file);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    if (uploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) void handleUpload(file);
  }

  async function handleView() {
    if (!selected) return;
    try {
      const url = await getDocumentDownloadUrl(selected.id);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("Couldn't get a link for this file.");
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>

      {selected ? (
        <div className="flex items-center justify-between gap-2 rounded-lg border p-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <FileIcon className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate text-sm">{selected.filename}</span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button type="button" size="sm" variant="ghost" onClick={handleView}>
              View
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              onClick={() => onChange(null)}
              aria-label={`Remove ${label.toLowerCase()}`}
            >
              <XIcon />
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed p-4 text-center transition-colors ${
              dragOver ? "border-ring bg-accent" : "border-input hover:bg-accent/50"
            } ${uploading ? "pointer-events-none opacity-60" : ""}`}
          >
            <UploadIcon className="size-5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              {uploading ? "Uploading…" : "Drag & drop a file, or click to upload"}
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={handleFileInput}
            disabled={uploading}
          />
          {options.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setBrowseOpen(true)}
              disabled={uploading}
            >
              Choose existing file
            </Button>
          )}
        </div>
      )}

      <Dialog open={browseOpen} onOpenChange={setBrowseOpen}>
        <DialogContent className="flex max-h-[70vh] w-full max-w-md flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
          <DialogHeader className="shrink-0 border-b bg-muted/40 px-5 py-4">
            <DialogTitle>Choose {label.toLowerCase()}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-1 overflow-y-auto p-3">
            {options.length === 0 ? (
              <p className="p-2 text-sm text-muted-foreground">No files uploaded yet.</p>
            ) : (
              options.map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => {
                    onChange(doc.id);
                    setBrowseOpen(false);
                  }}
                  className="flex items-center gap-2 rounded-md p-2 text-left text-sm hover:bg-accent"
                >
                  <FileIcon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{doc.filename}</span>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
