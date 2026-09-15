"use client";

import Link from "next/link";
import { DeleteJobButton } from "@/components/board/delete-job-button";
import { STAGE_COLORS, STAGE_LABELS, type Stage } from "@/lib/constants";
import { formatSalary } from "@/lib/format-salary";
import type { JobWithTags } from "@/server/db/queries/jobs";

export function JobListView({
  jobs,
  onDeleted,
}: {
  jobs: JobWithTags[];
  onDeleted: (id: string) => void;
}) {
  if (jobs.length === 0) {
    return (
      <div className="rounded-lg border">
        <p className="p-4 text-sm text-muted-foreground">No jobs match.</p>
      </div>
    );
  }

  return (
    <div className="divide-y rounded-lg border">
      {jobs.map((job) => (
        <JobListRow key={job.id} job={job} onDeleted={onDeleted} />
      ))}
    </div>
  );
}

function JobListRow({
  job,
  onDeleted,
}: {
  job: JobWithTags;
  onDeleted: (id: string) => void;
}) {
  const salary = formatSalary(job);
  const stage = job.stage as Stage;

  return (
    <div className="flex items-center gap-3.5 p-3 hover:bg-muted/40">
      <span
        className="size-2 shrink-0 rounded-full"
        style={{ backgroundColor: STAGE_COLORS[stage] }}
      />
      <Link href={`/jobs/${job.id}`} className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{job.positionName || "Untitled position"}</p>
        <p className="truncate text-xs text-muted-foreground">
          {job.companyName || "Unknown company"}
        </p>
      </Link>
      <span className="hidden w-28 shrink-0 text-xs text-muted-foreground sm:block">
        {STAGE_LABELS[stage] ?? stage}
      </span>
      <span className="hidden w-24 shrink-0 text-xs text-muted-foreground sm:block">
        {salary ?? "—"}
      </span>
      <DeleteJobButton
        jobId={job.id}
        label={job.companyName || job.positionName || "This job"}
        onDeleted={() => onDeleted(job.id)}
      />
    </div>
  );
}
