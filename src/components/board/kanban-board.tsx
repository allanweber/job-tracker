"use client";

import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { toast } from "sonner";
import { KanbanColumn } from "@/components/board/kanban-column";
import { JobCard } from "@/components/board/job-card";
import { STAGES, STAGE_LABELS, type Stage } from "@/lib/constants";
import { moveJob } from "@/server/actions/jobs";
import type { JobWithTags } from "@/server/db/queries/jobs";

/**
 * `closestCorners` (dnd-kit's usual default) ranks *every* droppable rect
 * by distance — including each card's own droppable nested inside a
 * column. A short/empty column (Interviewing, Offer — whichever has few
 * or no cards) is just a thin container rect, and routinely loses that
 * distance comparison to cards sitting in a taller neighboring column, so
 * it can end up effectively impossible to drop into even with the
 * pointer directly over it.
 *
 * `pointerWithin` instead asks "which droppable rects literally contain
 * the pointer" — an empty column resolves correctly regardless of what's
 * next to it, and when the pointer *is* over a card, both that card's
 * rect and its parent column's rect match (nested), with the smaller/more
 * specific one (the card) taking precedence for in-column reordering.
 * `rectIntersection` is only a fallback for the rare moment the pointer
 * sits somewhere no rect contains it at all (e.g. a column's outer
 * padding), so a drop there still resolves to the nearest column instead
 * of silently failing.
 */
const collisionDetectionStrategy: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);
  return pointerCollisions.length > 0 ? pointerCollisions : rectIntersection(args);
};

function groupByStage(jobs: JobWithTags[]) {
  const groups = Object.fromEntries(STAGES.map((s) => [s, [] as JobWithTags[]])) as Record<
    Stage,
    JobWithTags[]
  >;
  for (const job of jobs) {
    groups[job.stage as Stage]?.push(job);
  }
  for (const stage of STAGES) {
    groups[stage].sort((a, b) => a.boardOrder - b.boardOrder);
  }
  return groups;
}

export function KanbanBoard({
  jobs,
  setJobs,
  onDeleted,
}: {
  /** The (possibly search-filtered) jobs to display. */
  jobs: JobWithTags[];
  /** Setter for the full, unfiltered job list held by the parent. */
  setJobs: Dispatch<SetStateAction<JobWithTags[]>>;
  onDeleted: (id: string) => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const groups = useMemo(() => groupByStage(jobs), [jobs]);
  const activeJob = jobs.find((j) => j.id === activeId) ?? null;

  function findStage(id: string): Stage | null {
    if (STAGES.includes(id as Stage)) return id as Stage;
    return (jobs.find((j) => j.id === id)?.stage as Stage | undefined) ?? null;
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const jobId = String(active.id);
    const targetStage = findStage(String(over.id));
    if (!targetStage) return;

    const draggedJob = jobs.find((j) => j.id === jobId);
    const previousStage = draggedJob?.stage;
    const previousBoardOrder = draggedJob?.boardOrder;

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
      if (previousStage !== undefined && previousBoardOrder !== undefined) {
        setJobs((prev) =>
          prev.map((j) =>
            j.id === jobId ? { ...j, stage: previousStage, boardOrder: previousBoardOrder } : j,
          ),
        );
      }
      toast.error("Couldn't move that card — please try again.");
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetectionStrategy}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 lg:mx-0 lg:grid lg:grid-cols-5 lg:overflow-visible lg:px-0 lg:pb-0">
        {STAGES.map((stage) => (
          <KanbanColumn
            key={stage}
            stage={stage}
            label={STAGE_LABELS[stage]}
            jobs={groups[stage]}
            onDeleted={onDeleted}
            className="w-[78vw] shrink-0 snap-start sm:w-72 lg:w-auto lg:shrink"
          />
        ))}
      </div>
      <DragOverlay>{activeJob ? <JobCard job={activeJob} /> : null}</DragOverlay>
    </DndContext>
  );
}
