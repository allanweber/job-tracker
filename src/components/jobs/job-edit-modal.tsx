"use client";

import { useRouter } from "next/navigation";
import { JobFormModal } from "@/components/jobs/job-form-modal";
import { JobReviewForm } from "@/components/jobs/job-review-form";
import { DeleteJobButton } from "@/components/board/delete-job-button";
import type { JobEditValues } from "@/components/jobs/job-detail-client";
import type { documents } from "@/server/db/schema";

export function JobEditModal({
  job,
  documents: docs,
}: {
  job: JobEditValues;
  documents: (typeof documents.$inferSelect)[];
}) {
  const router = useRouter();
  // `router.back()`, not `router.push`: this is the intercepted-route modal,
  // and Next.js only resets an unmatched parallel-route slot (closing the
  // modal) on a backwards/popstate navigation — a plain push/replace leaves
  // it open.
  const close = () => router.back();

  return (
    <JobFormModal
      title="Edit job"
      headerActions={
        <DeleteJobButton
          jobId={job.id}
          label={job.companyName || job.positionName || "This job"}
          onDeleted={close}
          variant="button"
        />
      }
    >
      <JobReviewForm initialValues={job} documents={docs} onClose={close} />
    </JobFormModal>
  );
}
