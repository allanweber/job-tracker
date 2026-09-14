import type { JobParser, ParseContext, ExtractedJobFields } from "../types";
import { detectWorkMode } from "../work-mode";
import { extractSkillsFromText } from "../skills";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonNode = Record<string, any>;

function firstNonEmptyString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

/** remotar.com.br (a Brazilian remote-jobs board) renders no schema.org
 * markup at all — the job record only exists in the Next.js hydration
 * payload (`#__NEXT_DATA__` → props.pageProps.jobData). */
export const remotarParser: JobParser = {
  name: "remotar",

  canHandle(ctx: ParseContext) {
    try {
      return new URL(ctx.url).hostname.includes("remotar.com.br");
    } catch {
      return false;
    }
  },

  extract(ctx: ParseContext) {
    const raw = ctx.$("#__NEXT_DATA__").contents().text();
    if (!raw?.trim()) return null;

    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      return null;
    }

    const jobData = (data as JsonNode)?.props?.pageProps?.jobData as JsonNode | undefined;
    if (!jobData || typeof jobData !== "object") return null;

    const positionName = firstNonEmptyString(jobData.title);
    // `companyDisplayName` is an override that's usually null — the real
    // name lives on the nested `company` object.
    const companyName = firstNonEmptyString(jobData.companyDisplayName, jobData.company?.name);

    const location =
      [jobData.city, jobData.state, jobData.country].filter((v) => typeof v === "string" && v).join(", ") ||
      undefined;

    // `type` is their own field for this ("remote"/"hybrid"/"onsite"), not a
    // schema.org concept — plain text detection over it plus the description
    // covers whatever values they actually use for it.
    const description = firstNonEmptyString(jobData.description, jobData.subtitle);
    const workMode = detectWorkMode(jobData.type, location, description);
    const skills = extractSkillsFromText(description);

    const fields: ExtractedJobFields = {
      positionName,
      companyName,
      location,
      workMode,
      skills: skills.length > 0 ? skills : undefined,
    };

    return Object.values(fields).some((v) => v !== undefined) ? fields : null;
  },
};
