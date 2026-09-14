"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { documents } from "@/server/db/schema";

export function DocumentPicker({
  label,
  kind,
  documents: docs,
  value,
  onChange,
}: {
  label: string;
  kind: "resume" | "cover_letter";
  documents: (typeof documents.$inferSelect)[];
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const options = docs.filter((d) => d.kind === kind || d.kind === "other");

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium">{label}</label>
      <Select
        value={value ?? "none"}
        onValueChange={(v) => onChange(v === "none" ? null : v)}
      >
        <SelectTrigger>
          <SelectValue placeholder="None" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">None</SelectItem>
          {options.map((doc) => (
            <SelectItem key={doc.id} value={doc.id}>
              {doc.filename}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {options.length === 0 && (
        <p className="text-xs text-muted-foreground">
          No {kind === "resume" ? "resumes" : "cover letters"} uploaded yet — add one from the
          Documents page.
        </p>
      )}
    </div>
  );
}
