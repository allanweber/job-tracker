import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { jobs, jobTags, tags } from "@/server/db/schema";

export type JobWithTags = typeof jobs.$inferSelect & { tags: string[] };

export async function getJobsForUser(userId: string): Promise<JobWithTags[]> {
  const rows = await db
    .select({
      job: jobs,
      tagName: tags.name,
    })
    .from(jobs)
    .leftJoin(jobTags, eq(jobTags.jobId, jobs.id))
    .leftJoin(tags, eq(tags.id, jobTags.tagId))
    .where(eq(jobs.userId, userId))
    .orderBy(asc(jobs.boardOrder));

  const byId = new Map<string, JobWithTags>();
  for (const row of rows) {
    let entry = byId.get(row.job.id);
    if (!entry) {
      entry = { ...row.job, tags: [] };
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
  const [job, jobTagRows] = await Promise.all([
    getJobForUser(userId, jobId),
    db
      .select({ name: tags.name })
      .from(jobTags)
      .innerJoin(tags, eq(tags.id, jobTags.tagId))
      .where(eq(jobTags.jobId, jobId)),
  ]);
  if (!job) return null;

  return {
    id: job.id,
    // The DB column still allows a legacy "wishlist" value the board no
    // longer surfaces (see the comment on `STAGES` in lib/constants.ts) —
    // normalize it to "applied" here so the edit form's Status select
    // (which only lists current stages) always has a valid value to show,
    // rather than a stage no `SelectItem` matches.
    stage: job.stage === "wishlist" ? "applied" : job.stage,
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
