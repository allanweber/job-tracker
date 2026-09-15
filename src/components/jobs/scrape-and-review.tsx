"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { JobReviewForm } from "@/components/jobs/job-review-form";
import { runScrapeForUrl } from "@/server/actions/scrape";
import type { ExtractedJobFields } from "@/server/scraping/types";
import type { documents } from "@/server/db/schema";

export function ScrapeAndReview({
  url,
  documents: docs,
  onClose,
}: {
  url: string;
  documents: (typeof documents.$inferSelect)[];
  onClose?: () => void;
}) {
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "ok"; fields: ExtractedJobFields }
    | { status: "failed" }
  >({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    runScrapeForUrl(url).then((result) => {
      if (cancelled) return;
      if (result.status === "ok") setState({ status: "ok", fields: result.fields });
      else setState({ status: "failed" });
    });
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (state.status === "loading") {
    return (
      <div className="flex max-w-2xl flex-col gap-4">
        <p className="text-sm text-muted-foreground">Scraping {url}…</p>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  const banner =
    state.status === "failed"
      ? {
          tone: "warning" as const,
          message:
            "Couldn't auto-fill this one — it's been logged for review. Please fill in the details manually.",
        }
      : null;

  return (
    <JobReviewForm
      initialValues={{ sourceUrl: url, ...(state.status === "ok" ? state.fields : {}) }}
      documents={docs}
      scrapeBanner={banner}
      onClose={onClose}
    />
  );
}
