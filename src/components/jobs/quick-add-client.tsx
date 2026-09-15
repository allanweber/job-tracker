"use client";

import { useState } from "react";
import { ScrapeAndReview } from "@/components/jobs/scrape-and-review";
import { JobReviewForm } from "@/components/jobs/job-review-form";
import type { documents } from "@/server/db/schema";

/**
 * The bookmarklet's destination — deliberately outside the `(app)` layout
 * (no nav header, no sidebar) so it reads as a small standalone dialog
 * when opened in the compact popup window `settings/bookmarklet/page.tsx`
 * builds, rather than the full app shell crammed into a tiny window.
 */
export function QuickAddClient({
  url,
  documents: docs,
}: {
  url?: string;
  documents: (typeof documents.$inferSelect)[];
}) {
  const [done, setDone] = useState(false);

  function close() {
    setDone(true);
    // Only actually closes when this tab was opened by script (true for
    // the bookmarklet's popup) — browsers refuse to close a tab a user
    // opened themselves. Either way the "Saved" state below is the real
    // fallback: it's a clear next step even if the close is blocked.
    setTimeout(() => window.close(), 500);
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-1 py-10 text-center">
        <p className="text-lg font-medium">✅ Saved</p>
        <p className="text-sm text-muted-foreground">You can close this window now.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold">Add job</h1>
      {url ? (
        <ScrapeAndReview key={url} url={url} documents={docs} onClose={close} />
      ) : (
        <JobReviewForm initialValues={{ sourceUrl: "" }} documents={docs} onClose={close} />
      )}
    </div>
  );
}
