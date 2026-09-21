import type { JobParser, ParseContext, ExtractedJobFields } from "../types";
import { detectWorkMode } from "../work-mode";
import { extractSkillsFromText } from "../skills";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonNode = Record<string, any>;

/** Greenhouse's current job board (job-boards.greenhouse.io) is a
 * client-rendered Remix app: the server-sent HTML has no JSON-LD and no
 * `og:site_name`, only a bare `og:title` with the position name — the
 * company name only shows up buried in the plain `<title>` tag
 * ("Job Application for {title} at {company} ({source})"). The real
 * structured record ships anyway, inlined as the Remix hydration payload in
 * `window.__remixContext`, so read that directly instead of scraping text. */
function extractRemixContext(html: string): JsonNode | undefined {
  const match = html.match(/window\.__remixContext\s*=\s*(\{[\s\S]*?\});(?:\s*<\/script>|\s*window\.)/);
  if (!match) return undefined;
  try {
    return JSON.parse(match[1]);
  } catch {
    return undefined;
  }
}

function findJobPost(context: JsonNode): JsonNode | undefined {
  const loaderData = context?.state?.loaderData;
  if (!loaderData || typeof loaderData !== "object") return undefined;
  for (const value of Object.values(loaderData) as JsonNode[]) {
    if (value && typeof value === "object" && value.jobPost && typeof value.jobPost === "object") {
      return value.jobPost as JsonNode;
    }
  }
  return undefined;
}

/** `company_name` on this payload is the board's display name, which often
 * carries a trailing referral-channel label ("Acme Inc (Website)") that
 * isn't part of the actual company name. */
function cleanCompanyName(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const cleaned = raw.replace(/\s*\([A-Za-z][A-Za-z .]*\)\s*$/, "").trim();
  return cleaned || undefined;
}

function stripHtml(html: unknown): string | undefined {
  return typeof html === "string" ? html.replace(/<[^>]+>/g, " ") : undefined;
}

/** Observed shape: `pay_ranges: [{ title, min_cents, max_cents,
 * currency_type, pay_period }]`. Defensive about the exact keys since it's
 * undocumented and only ever seen on postings with disclosed comp. */
function extractSalary(jobPost: JsonNode): Partial<ExtractedJobFields> {
  const ranges = jobPost.pay_ranges;
  const range = Array.isArray(ranges) ? ranges[0] : undefined;
  if (!range || typeof range !== "object") return {};

  const minCents = typeof range.min_cents === "number" ? range.min_cents : undefined;
  const maxCents = typeof range.max_cents === "number" ? range.max_cents : undefined;
  const currency = typeof range.currency_type === "string" ? range.currency_type : undefined;
  const periodText = typeof range.pay_period === "string" ? range.pay_period : undefined;
  const period = periodText ? (/hour/i.test(periodText) ? "hour" : "year") : undefined;

  if (minCents === undefined && maxCents === undefined) return {};

  return {
    salaryMin: minCents !== undefined ? minCents / 100 : undefined,
    salaryMax: maxCents !== undefined ? maxCents / 100 : undefined,
    salaryCurrency: currency,
    salaryPeriod: period,
  };
}

export const greenhouseParser: JobParser = {
  name: "greenhouse",

  canHandle(ctx: ParseContext) {
    try {
      if (!new URL(ctx.url).hostname.endsWith("greenhouse.io")) return false;
    } catch {
      return false;
    }
    return ctx.html.includes("window.__remixContext");
  },

  extract(ctx: ParseContext) {
    const context = extractRemixContext(ctx.html);
    if (!context) return null;

    const jobPost = findJobPost(context);
    if (!jobPost) return null;

    const positionName = typeof jobPost.title === "string" ? jobPost.title.trim() : undefined;
    const companyName = cleanCompanyName(jobPost.company_name);
    const location =
      typeof jobPost.job_post_location === "string" ? jobPost.job_post_location.trim() : undefined;
    const description = stripHtml(jobPost.content);

    const workMode = detectWorkMode(positionName, location, description);
    const skills = extractSkillsFromText(description);

    const fields: ExtractedJobFields = {
      positionName,
      companyName,
      location,
      workMode,
      skills: skills.length > 0 ? skills : undefined,
      ...extractSalary(jobPost),
    };

    return Object.values(fields).some((v) => v !== undefined) ? fields : null;
  },
};
