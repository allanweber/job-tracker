import type { CheerioAPI } from "cheerio";

export interface ParseContext {
  url: string;
  html: string;
  $: CheerioAPI;
}

export interface ExtractedJobFields {
  positionName?: string;
  companyName?: string;
  location?: string;
  workMode?: "remote" | "hybrid" | "onsite";
  salaryRawText?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  salaryPeriod?: "year" | "hour";
  skills?: string[];
}

export interface JobParser {
  name: string;
  canHandle(ctx: ParseContext): boolean;
  extract(ctx: ParseContext): ExtractedJobFields | null;
}

export function isSufficient(fields: ExtractedJobFields): boolean {
  return Boolean(fields.positionName && fields.companyName);
}
