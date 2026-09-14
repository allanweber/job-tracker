"use server";

import { requireUser } from "@/server/auth/session";
import { scrapeJobUrl } from "@/server/scraping/orchestrator";

export async function runScrapeForUrl(url: string) {
  const user = await requireUser();
  try {
    return await scrapeJobUrl(url, user.id);
  } catch (err) {
    // Invalid/unsafe URL, etc. — surface as a failed scrape, not a hard error.
    return { status: "failed" as const, fields: {}, reason: err instanceof Error ? err.message : undefined };
  }
}
