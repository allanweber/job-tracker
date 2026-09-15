"use client";

import { useRouter } from "next/navigation";
import { ScrapeAndReview } from "@/components/jobs/scrape-and-review";
import { JobReviewForm } from "@/components/jobs/job-review-form";
import type { documents } from "@/server/db/schema";

export function JobNewPageClient({
  url,
  documents: docs,
}: {
  url?: string;
  documents: (typeof documents.$inferSelect)[];
}) {
  const router = useRouter();
  const close = () => router.push("/board");

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Add job</h1>
      {url ? (
        <ScrapeAndReview key={url} url={url} documents={docs} onClose={close} />
      ) : (
        <JobReviewForm initialValues={{ sourceUrl: "" }} documents={docs} onClose={close} />
      )}
    </div>
  );
}
