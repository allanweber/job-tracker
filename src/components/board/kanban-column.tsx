"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { JobCard } from "@/components/board/job-card";
import { STAGE_COLORS, type Stage } from "@/lib/constants";
import type { JobWithTags } from "@/server/db/queries/jobs";

export function KanbanColumn({
  stage,
  label,
  jobs,
  onDeleted,
  className,
}: {
  stage: Stage;
  label: string;
  jobs: JobWithTags[];
  onDeleted: (id: string) => void;
  className?: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage, data: { stage } });

  return (
    <div className={`flex min-w-0 flex-col gap-2 ${className ?? ""}`}>
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5">
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: STAGE_COLORS[stage] }}
          />
          <h2 className="text-sm font-semibold">{label}</h2>
        </div>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {jobs.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex min-h-32 flex-1 flex-col gap-2 rounded-lg border border-dashed p-2 transition-colors ${
          isOver ? "border-primary bg-accent/50" : "border-transparent bg-muted/30"
        }`}
      >
        <SortableContext items={jobs.map((j) => j.id)} strategy={verticalListSortingStrategy}>
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} onDeleted={onDeleted} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
