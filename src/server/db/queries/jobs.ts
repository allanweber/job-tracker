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
