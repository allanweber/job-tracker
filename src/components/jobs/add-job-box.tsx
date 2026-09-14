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
    router.push(trimmed ? `/jobs/new?url=${encodeURIComponent(trimmed)}` : "/jobs/new");
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        type="url"
        inputMode="url"
        placeholder="Paste a job posting URL…"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        className="max-w-md"
      />
      <Button type="submit">Add job</Button>
      <Button type="button" variant="ghost" onClick={() => router.push("/jobs/new")}>
        Add manually
      </Button>
    </form>
  );
}
