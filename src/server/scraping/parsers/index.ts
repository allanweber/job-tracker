import type { JobParser, ParseContext, ExtractedJobFields } from "../types";
import { isSufficient } from "../types";
import { jsonLdJobPostingParser } from "./json-ld-jobposting";
import { linkedInParser } from "./linkedin";
import { openGraphFallbackParser } from "./opengraph-fallback";

/** Ordered: most structured/reliable first, generic fallback last. */
export const parsers: JobParser[] = [jsonLdJobPostingParser, linkedInParser, openGraphFallbackParser];

export function runParsers(ctx: ParseContext): ExtractedJobFields {
  let merged: ExtractedJobFields = {};

  for (const parser of parsers) {
    if (!parser.canHandle(ctx)) continue;
    const result = parser.extract(ctx);
    if (!result) continue;

    merged = { ...result, ...merged }; // fields already found take priority
    if (isSufficient(merged)) break;
  }

  return merged;
}

export { isSufficient };
