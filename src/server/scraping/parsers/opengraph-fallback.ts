import type { JobParser, ParseContext, ExtractedJobFields } from "../types";
import { detectWorkMode } from "../work-mode";
import { extractSkillsFromText } from "../skills";

/** How much of the raw body text to scan for skill keywords — bounded so a
 * huge page (nav/footer/related-jobs cruft included) can't make this slow. */
const BODY_SCAN_CHARS = 20_000;

function extractLocation(ctx: ParseContext): string | undefined {
  const { $ } = ctx;

  // Some sites use schema.org microdata (itemprop attributes) instead of
  // JSON-LD for the same JobPosting data.
  const microdata = $('[itemprop="jobLocation"] [itemprop="addressLocality"], [itemprop="addressLocality"]')
    .first()
    .text()
    .trim();
  if (microdata) return microdata;

  // Generic heuristic: most ATS/career-page templates put the location in an
  // element whose class/id mentions "location". Take the first reasonably
  // short match — long text is more likely a paragraph that happens to
  // contain the word than an actual location field.
  const candidates = $('[class*="location" i], [id*="location" i]').toArray();
  for (const el of candidates) {
    const text = $(el).text().trim().replace(/\s+/g, " ");
    if (text && text.length <= 80 && !text.includes("\n")) return text;
  }

  return undefined;
}

/** Last-resort parser: applies to any site, using generic meta tags, loose
 * class-name heuristics, and keyword scanning — inherently noisier than the
 * structured parsers, which is fine since the user always reviews/edits
 * before saving. */
export const openGraphFallbackParser: JobParser = {
  name: "opengraph-fallback",

  canHandle() {
    return true;
  },

  extract(ctx: ParseContext) {
    const { $ } = ctx;
    const fields: ExtractedJobFields = {};

    const ogTitle = $('meta[property="og:title"]').attr("content")?.trim();
    const title = ogTitle || $("title").first().text().trim();
    const siteName = $('meta[property="og:site_name"]').attr("content")?.trim();
    const metaDescription =
      $('meta[property="og:description"]').attr("content")?.trim() ||
      $('meta[name="description"]').attr("content")?.trim();

    if (title) {
      // Common patterns: "Position - Company", "Position at Company", "Position | Company"
      const separators = [" - ", " – ", " at ", " | "];
      let split: [string, string] | null = null;
      for (const sep of separators) {
        if (title.includes(sep)) {
          const [a, b] = title.split(sep);
          split = [a.trim(), b.trim()];
          break;
        }
      }
      if (split) {
        fields.positionName = split[0];
        fields.companyName = siteName || split[1];
      } else {
        fields.positionName = title;
        if (siteName) fields.companyName = siteName;
      }
    } else if (siteName) {
      fields.companyName = siteName;
    }

    const location = extractLocation(ctx);
    if (location) fields.location = location;

    // Plain career-page copy ("This is a hybrid role...") is often the only
    // place work mode is stated at all — meta tags and the title rarely say
    // it — so the visible body text has to be part of this scan, not just
    // an afterthought for skills.
    const bodyText = $("body").text().slice(0, BODY_SCAN_CHARS);

    const detectedWorkMode = detectWorkMode(title, metaDescription, location, bodyText);
    if (detectedWorkMode) fields.workMode = detectedWorkMode;

    const skills = extractSkillsFromText(`${metaDescription ?? ""} ${bodyText}`);
    if (skills.length > 0) fields.skills = skills;

    return Object.keys(fields).length > 0 ? fields : null;
  },
};
