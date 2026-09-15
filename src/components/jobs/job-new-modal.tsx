"use client";

import { useRouter } from "next/navigation";
import { JobFormModal } from "@/components/jobs/job-form-modal";
import { ScrapeAndReview } from "@/components/jobs/scrape-and-review";
import { JobReviewForm } from "@/components/jobs/job-review-form";
import type { documents } from "@/server/db/schema";

export function JobNewModal({
  url,
  documents: docs,
}: {
  url?: string;
  documents: (typeof documents.$inferSelect)[];
}) {
  const router = useRouter();
  // `router.back()`, not `router.push`: this is the intercepted-route modal,
  // and Next.js only resets an unmatched parallel-route slot (closing the
  // modal) on a backwards/popstate navigation — a plain push leaves it open.
  const close = () => router.back();

  return (
    <JobFormModal title="Add job">
      {url ? (
        <ScrapeAndReview key={url} url={url} documents={docs} onClose={close} />
      ) : (
        <JobReviewForm initialValues={{ sourceUrl: "" }} documents={docs} onClose={close} />
      )}
    </JobFormModal>
  );
}
