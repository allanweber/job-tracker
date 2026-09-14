"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { toast } from "sonner";
import { KanbanColumn } from "@/components/board/kanban-column";
import { JobCard } from "@/components/board/job-card";
import { STAGES, STAGE_LABELS, type Stage } from "@/lib/constants";
import { moveJob } from "@/server/actions/jobs";
import type { JobWithTags } from "@/server/db/queries/jobs";

function groupByStage(jobs: JobWithTags[]) {
  const groups = Object.fromEntries(STAGES.map((s) => [s, [] as JobWithTags[]])) as Record<
    Stage,
    JobWithTags[]
  >;
  for (const job of jobs) {
    groups[job.stage as Stage].push(job);
  }
  for (const stage of STAGES) {
    groups[stage].sort((a, b) => a.boardOrder - b.boardOrder);
  }
  return groups;
}

export function KanbanBoard({ initialJobs }: { initialJobs: JobWithTags[] }) {
  const [jobs, setJobs] = useState(initialJobs);
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const groups = useMemo(() => groupByStage(jobs), [jobs]);
  const activeJob = jobs.find((j) => j.id === activeId) ?? null;

  function findStage(id: string): Stage | null {
    if (STAGES.includes(id as Stage)) return id as Stage;
    return jobs.find((j) => j.id === id)?.stage as Stage | undefined ?? null;
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeStage = findStage(String(active.id));
    const overStage = findStage(String(over.id));
    if (!activeStage || !overStage || activeStage === overStage) return;

    setJobs((prev) => prev.map((j) => (j.id === active.id ? { ...j, stage: overStage } : j)));
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const jobId = String(active.id);
    const targetStage = findStage(String(over.id));
    if (!targetStage) return;

    const previousJobs = jobs;
    const columnJobs = groupByStage(jobs)[targetStage].filter((j) => j.id !== jobId);
    const overIndex = columnJobs.findIndex((j) => j.id === over.id);
    const insertAt = overIndex === -1 ? columnJobs.length : overIndex;

    const before = columnJobs[insertAt - 1]?.boardOrder;
    const after = columnJobs[insertAt]?.boardOrder;
    const boardOrder =
      before !== undefined && after !== undefined
        ? (before + after) / 2
        : before !== undefined
          ? before + 1
          : after !== undefined
            ? after - 1
            : 0;

    setJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, stage: targetStage, boardOrder } : j)),
    );

    try {
      await moveJob(jobId, { stage: targetStage, boardOrder });
    } catch {
      setJobs(previousJobs);
      toast.error("Couldn't move that card — please try again.");
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map((stage) => (
          <KanbanColumn
            key={stage}
            stage={stage}
            label={STAGE_LABELS[stage]}
            jobs={groups[stage]}
          />
        ))}
      </div>
      <DragOverlay>{activeJob ? <JobCard job={activeJob} /> : null}</DragOverlay>
    </DndContext>
  );
}
