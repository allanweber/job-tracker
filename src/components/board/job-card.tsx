"use client";

import Link from "next/link";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FollowUpBadge } from "@/components/board/follow-up-badge";
import { DeleteJobButton } from "@/components/board/delete-job-button";
import { WORK_MODE_LABELS } from "@/lib/constants";
import { formatSalary } from "@/lib/format-salary";
import type { JobWithTags } from "@/server/db/queries/jobs";

export function JobCard({
  job,
  onDeleted,
}: {
  job: JobWithTags;
  onDeleted?: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: job.id,
    data: { stage: job.stage },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const salary = formatSalary(job);

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="relative cursor-grab gap-2 py-3 active:cursor-grabbing"
    >
      {onDeleted && (
        <DeleteJobButton
          jobId={job.id}
          label={job.companyName || job.positionName || "This job"}
          onDeleted={() => onDeleted(job.id)}
          className="absolute top-2 right-2"
        />
      )}
      <CardHeader className="px-3 pr-8">
        <Link
          href={`/jobs/${job.id}`}
          className="font-medium leading-tight hover:underline"
          // Avoid the drag listeners hijacking a plain click on the title.
          onClick={(e) => e.stopPropagation()}
        >
          {job.companyName || "Unknown company"}
        </Link>
        <p className="text-sm text-muted-foreground">{job.positionName || "Untitled position"}</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 px-3">
        <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          {job.location && <span>{job.location}</span>}
          {job.workMode && (
            <Badge variant="outline" className="text-xs">
              {WORK_MODE_LABELS[job.workMode]}
            </Badge>
          )}
        </div>
        {salary && <p className="text-xs text-muted-foreground">{salary}</p>}
        {job.skills.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {job.skills.slice(0, 4).map((skill) => (
              <Badge key={skill} variant="secondary" className="text-xs">
                {skill}
              </Badge>
            ))}
          </div>
        )}
        <FollowUpBadge followUpDate={job.followUpDate} />
      </CardContent>
    </Card>
  );
}
