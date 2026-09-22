import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { jobs, jobTags, tags, jobStageHistory } from "@/server/db/schema";
import { normalizeStage, type Stage } from "@/lib/constants";

export type JobWithTags = typeof jobs.$inferSelect & {
  tags: string[];
  stageCount: number;
  /** Distinct stages this job has ever been in, per `job_stage_history` —
   * e.g. a job now "rejected" that passed through "offer" still has "offer"
   * here, which is what a reach-based funnel/rate needs (as opposed to
   * `stage`, which only has the current one). */
  reachedStages: Stage[];
  /** The same history, but as the ordered sequence it happened in (always
   * starting with "applied") rather than a deduped set — what the Pipeline
   * chart walks to build its stage-to-stage flow. */
  stagePath: Stage[];
};

export async function getJobsForUser(userId: string): Promise<JobWithTags[]> {
  // Joining stage-history rows into the same query as tags would cross the
  // two joins and inflate row counts (tags × history rows per job), so
  // it's fetched separately and merged in-memory instead.
  const [rows, historyRows] = await Promise.all([
    db
      .select({
        job: jobs,
        tagName: tags.name,
      })
      .from(jobs)
      .leftJoin(jobTags, eq(jobTags.jobId, jobs.id))
      .leftJoin(tags, eq(tags.id, jobTags.tagId))
      .where(eq(jobs.userId, userId))
      .orderBy(asc(jobs.boardOrder)),
    db
      .select({ jobId: jobStageHistory.jobId, stage: jobStageHistory.stage })
      .from(jobStageHistory)
      .innerJoin(jobs, eq(jobs.id, jobStageHistory.jobId))
      .where(eq(jobs.userId, userId))
      .orderBy(asc(jobStageHistory.changedAt)),
  ]);

  const stageCountById = new Map<string, number>();
  const reachedStagesById = new Map<string, Set<Stage>>();
  const stagePathById = new Map<string, Stage[]>();
  for (const h of historyRows) {
    stageCountById.set(h.jobId, (stageCountById.get(h.jobId) ?? 0) + 1);
    const stage = normalizeStage(h.stage);
    // Every job genuinely starts at "applied" (saveJob's create path
    // hardcodes it) — but a job created before this history table existed
    // was backfilled with only its *current* stage, not that origin. Seed
    // both derived views with "applied" so a backfilled "rejected"-only job
    // still reads as applied → rejected instead of skipping "applied"
    // entirely, same as a job whose history really was recorded live.
    const set = reachedStagesById.get(h.jobId) ?? new Set<Stage>(["applied"]);
    set.add(stage);
    reachedStagesById.set(h.jobId, set);
    // Defensive: a transition back to the stage a job is already sitting in
    // should never be logged (see `recordStageChange`), but the Pipeline
    // chart treats consecutive-identical entries as real forward moves, so
    // guard against it here too rather than trust every writer forever.
    const path = stagePathById.get(h.jobId) ?? (["applied"] as Stage[]);
    if (path[path.length - 1] !== stage) path.push(stage);
    stagePathById.set(h.jobId, path);
  }

  const byId = new Map<string, JobWithTags>();
  for (const row of rows) {
    let entry = byId.get(row.job.id);
    if (!entry) {
      entry = {
        ...row.job,
        tags: [],
        stageCount: stageCountById.get(row.job.id) ?? 0,
        reachedStages: [...(reachedStagesById.get(row.job.id) ?? new Set<Stage>(["applied"]))],
        stagePath: stagePathById.get(row.job.id) ?? ["applied"],
      };
      byId.set(row.job.id, entry);
    }
    if (row.tagName) entry.tags.push(row.tagName);
  }
  return [...byId.values()];
}

export async function getJobForUser(userId: string, jobId: string) {
  const [row] = await db
    .select()
    .from(jobs)
    .where(and(eq(jobs.id, jobId), eq(jobs.userId, userId)))
    .limit(1);
  return row ?? null;
}

/** Job fields shaped as `JobReviewForm` initial values, plus the tag names for that job. */
export async function getJobEditValues(userId: string, jobId: string) {
  const [job, jobTagRows, stageHistory] = await Promise.all([
    getJobForUser(userId, jobId),
    db
      .select({ name: tags.name })
      .from(jobTags)
      .innerJoin(tags, eq(tags.id, jobTags.tagId))
      .where(eq(jobTags.jobId, jobId)),
    db
      .select({ stage: jobStageHistory.stage, changedAt: jobStageHistory.changedAt })
      .from(jobStageHistory)
      .where(eq(jobStageHistory.jobId, jobId))
      .orderBy(asc(jobStageHistory.changedAt)),
  ]);
  if (!job) return null;

  return {
    id: job.id,
    // The DB column still allows a legacy "wishlist" value the board no
    // longer surfaces (see the comment on `STAGES` in lib/constants.ts) —
    // normalize it to "applied" here so the edit form's Status select
    // (which only lists current stages) always has a valid value to show,
    // rather than a stage no `SelectItem` matches.
    stage: normalizeStage(job.stage),
    sourceUrl: job.sourceUrl,
    positionName: job.positionName ?? "",
    companyName: job.companyName ?? "",
    location: job.location ?? "",
    workMode: job.workMode,
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
    salaryCurrency: job.salaryCurrency ?? "",
    salaryPeriod: job.salaryPeriod,
    salaryRawText: job.salaryRawText ?? "",
    skills: job.skills,
    tags: jobTagRows.map((r) => r.name),
    // Same legacy-"wishlist" normalization as `stage` above — no history
    // row is ever written with it, but the column type still allows it.
    stageHistory: stageHistory.map((h) => ({ ...h, stage: normalizeStage(h.stage) })),
    notes: job.notes ?? "",
    followUpDate: job.followUpDate ?? "",
    contactPerson: job.contactPerson ?? "",
    resumeDocumentId: job.resumeDocumentId,
    coverLetterDocumentId: job.coverLetterDocumentId,
  };
}

/** Fractional index for the top of a column: below the current minimum. */
export async function nextTopBoardOrder(userId: string, stage: (typeof jobs.$inferSelect)["stage"]) {
  const rows = await db
    .select({ boardOrder: jobs.boardOrder })
    .from(jobs)
    .where(and(eq(jobs.userId, userId), eq(jobs.stage, stage)))
    .orderBy(asc(jobs.boardOrder))
    .limit(1);
  const min = rows[0]?.boardOrder ?? 0;
  return min - 1;
}
