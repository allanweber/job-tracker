"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AddJobBox() {
  const [url, setUrl] = useState("");
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;
    router.push(`/jobs/new?url=${encodeURIComponent(trimmed)}`);
    setUrl("");
  }

  return (
    <div className="flex flex-wrap items-center gap-2.5 rounded-lg border bg-muted/40 px-3.5 py-3">
      <Button
        type="button"
        variant="cta"
        onClick={() => router.push("/jobs/new")}
        className="shrink-0"
      >
        + Add new job
      </Button>
      <span className="shrink-0 text-xs text-muted-foreground">
        or paste a posting URL to auto-fill
      </span>
      <form onSubmit={handleSubmit} className="flex min-w-60 flex-1 gap-2">
        <Input
          type="url"
          inputMode="url"
          placeholder="https://…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="min-w-0 flex-1"
        />
        <Button type="submit" variant="outline" className="shrink-0">
          Fetch
        </Button>
      </form>
    </div>
  );
}
