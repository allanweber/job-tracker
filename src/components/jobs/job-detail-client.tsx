"use client";

import { useRouter } from "next/navigation";
import { JobReviewForm } from "@/components/jobs/job-review-form";
import { DeleteJobButton } from "@/components/board/delete-job-button";
import type { documents } from "@/server/db/schema";
import type { getJobEditValues } from "@/server/db/queries/jobs";

export type JobEditValues = NonNullable<Awaited<ReturnType<typeof getJobEditValues>>>;

export function JobDetailClient({
  job,
  documents: docs,
}: {
  job: JobEditValues;
  documents: (typeof documents.$inferSelect)[];
}) {
  const router = useRouter();
  const close = () => router.push("/board");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Edit job</h1>
        <DeleteJobButton
          jobId={job.id}
          label={job.companyName || job.positionName || "This job"}
          onDeleted={close}
          variant="button"
        />
      </div>
      <JobReviewForm initialValues={job} documents={docs} onClose={close} />
    </div>
  );
}
