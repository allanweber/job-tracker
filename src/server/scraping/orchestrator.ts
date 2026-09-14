import "server-only";
import * as cheerio from "cheerio";
import { db } from "@/server/db";
import { scrapeFailures } from "@/server/db/schema";
import { fetchHtml } from "./fetch-html";
import { renderHtml } from "./render-html";
import { runParsers } from "./parsers";
import { isSufficient, type ExtractedJobFields } from "./types";
import { assertSafeUrl } from "./url-safety";

export type ScrapeResult =
  | { status: "ok"; tier: "tier1" | "tier2"; fields: ExtractedJobFields }
  | { status: "failed"; fields: Record<string, never> };

export async function scrapeJobUrl(rawUrl: string, userId: string): Promise<ScrapeResult> {
  const url = assertSafeUrl(rawUrl);
  const domain = url.hostname;
  let lastError: string | undefined;

  try {
    const html = await fetchHtml(url.toString());
    const fields = runParsers({ url: url.toString(), html, $: cheerio.load(html) });
    if (isSufficient(fields)) return { status: "ok", tier: "tier1", fields };
  } catch (err) {
    lastError = err instanceof Error ? err.message : "tier1 fetch failed";
  }

  try {
    const html = await renderHtml(url.toString());
    const fields = runParsers({ url: url.toString(), html, $: cheerio.load(html) });
    if (isSufficient(fields)) return { status: "ok", tier: "tier2", fields };
    lastError = "tier2 rendered page but extraction was insufficient";
  } catch (err) {
    lastError = err instanceof Error ? err.message : "tier2 render failed";
  }

  await db.insert(scrapeFailures).values({
    userId,
    url: url.toString(),
    domain,
    tierReached: "tier2",
    errorReason: lastError ?? "unknown error",
  });

  return { status: "failed", fields: {} };
}
