import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { scrapeFailures } from "@/server/db/schema";

export async function listScrapeFailuresForUser(userId: string, limit = 100) {
  return db
    .select()
    .from(scrapeFailures)
    .where(eq(scrapeFailures.userId, userId))
    .orderBy(desc(scrapeFailures.createdAt))
    .limit(limit);
}
