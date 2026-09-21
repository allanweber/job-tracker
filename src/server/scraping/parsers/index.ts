import type { JobParser, ParseContext, ExtractedJobFields } from "../types";
import { isSufficient } from "../types";
import { jsonLdJobPostingParser } from "./json-ld-jobposting";
import { linkedInParser } from "./linkedin";
import { remotarParser } from "./remotar";
import { greenhouseParser } from "./greenhouse";
import { openGraphFallbackParser } from "./opengraph-fallback";

/** Ordered: most structured/reliable first, generic fallback last. */
export const parsers: JobParser[] = [
  jsonLdJobPostingParser,
  linkedInParser,
  remotarParser,
  greenhouseParser,
  openGraphFallbackParser,
];

/** Fills in only the fields `base` is missing from `next` — field-by-field,
 * not a blind object spread. A plain `{...next, ...base}` looks equivalent
 * but isn't: every parser's result object literal has EVERY key present,
 * even ones it didn't find (`location: undefined`), so spreading `base`
 * second would silently overwrite a real value `next` found with that
 * explicit `undefined`. */
function fillMissing(base: ExtractedJobFields, next: ExtractedJobFields): ExtractedJobFields {
  return {
    positionName: base.positionName ?? next.positionName,
    companyName: base.companyName ?? next.companyName,
    location: base.location ?? next.location,
    workMode: base.workMode ?? next.workMode,
    salaryRawText: base.salaryRawText ?? next.salaryRawText,
    salaryMin: base.salaryMin ?? next.salaryMin,
    salaryMax: base.salaryMax ?? next.salaryMax,
    salaryCurrency: base.salaryCurrency ?? next.salaryCurrency,
    salaryPeriod: base.salaryPeriod ?? next.salaryPeriod,
    skills: base.skills ?? next.skills,
  };
}

export function runParsers(ctx: ParseContext): ExtractedJobFields {
  let merged: ExtractedJobFields = {};

  // Deliberately does NOT stop once positionName+companyName are found:
  // every parser here is a cheap synchronous scan of the same already-fetched
  // HTML (no extra I/O), and the more specific parsers (json-ld, linkedin)
  // routinely find the title/company but not location/workMode/skills, which
  // the generic fallback is often the only one that can supply. Stopping
  // early meant the fallback frequently never ran at all.
  for (const parser of parsers) {
    if (!parser.canHandle(ctx)) continue;
    const result = parser.extract(ctx);
    if (!result) continue;

    merged = fillMissing(merged, result); // fields already found take priority
  }

  // A role explicitly described as remote almost always means "no fixed
  // location" rather than "we forgot to say" — a reasonable default when
  // nothing more specific was found.
  if (merged.workMode === "remote" && !merged.location) {
    merged.location = "Remote";
  }

  return merged;
}

export { isSufficient };
