import "server-only";
import { and, asc, eq, ilike } from "drizzle-orm";
import { db } from "@/server/db";
import { tags, jobTags } from "@/server/db/schema";
import type { PgTransaction } from "drizzle-orm/pg-core";

export async function getTagSuggestions(userId: string, prefix: string, limit = 10) {
  return db
    .select({ name: tags.name })
    .from(tags)
    .where(and(eq(tags.userId, userId), ilike(tags.name, `${prefix}%`)))
    .orderBy(asc(tags.name))
    .limit(limit);
}

/**
 * Ensure `tags`/`job_tags` rows reflect exactly `tagNames` for the given job.
 * Must be called inside the same transaction as the job insert/update.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function syncJobTags(tx: PgTransaction<any, any, any>, userId: string, jobId: string, tagNames: string[]) {
  await tx.delete(jobTags).where(eq(jobTags.jobId, jobId));

  const uniqueNames = [...new Set(tagNames.map((n) => n.trim()).filter(Boolean))];
  if (uniqueNames.length === 0) return;

  const tagIds: string[] = [];
  for (const name of uniqueNames) {
    const [row] = await tx
      .insert(tags)
      .values({ userId, name })
      .onConflictDoUpdate({
        target: [tags.userId, tags.name],
        set: { name },
      })
      .returning({ id: tags.id });
    tagIds.push(row.id);
  }

  await tx.insert(jobTags).values(tagIds.map((tagId) => ({ jobId, tagId })));
}
