import type { JobParser, ParseContext, ExtractedJobFields } from "../types";
import { parseSalary } from "../salary/parse-salary";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonLdNode = Record<string, any>;

function findJobPostingNodes(parsed: unknown): JsonLdNode[] {
  const nodes: JsonLdNode[] = [];
  const visit = (value: unknown) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (typeof value !== "object") return;
    const node = value as JsonLdNode;
    const type = node["@type"];
    const types = Array.isArray(type) ? type : [type];
    if (types.includes("JobPosting")) nodes.push(node);
    if (node["@graph"]) visit(node["@graph"]);
  };
  visit(parsed);
  return nodes;
}

function extractLocation(node: JsonLdNode): string | undefined {
  const loc = node.jobLocation;
  const address = Array.isArray(loc) ? loc[0]?.address : loc?.address;
  if (!address) return undefined;
  const parts = [address.addressLocality, address.addressRegion, address.addressCountry].filter(
    Boolean,
  );
  return parts.length > 0 ? parts.join(", ") : undefined;
}

function extractWorkMode(node: JsonLdNode): ExtractedJobFields["workMode"] {
  const type = node.jobLocationType;
  if (typeof type === "string" && /telecommute|remote/i.test(type)) return "remote";
  if (node.applicantLocationRequirements) return "remote";
  return undefined;
}

function extractSalary(node: JsonLdNode): Partial<ExtractedJobFields> {
  const base = node.baseSalary;
  const value = base?.value;
  if (!value) return {};

  const currency = base.currency;
  const unitText = value.unitText as string | undefined;
  const period = unitText && /hour/i.test(unitText) ? "hour" : unitText ? "year" : undefined;

  const min = typeof value.minValue === "number" ? value.minValue : undefined;
  const max = typeof value.maxValue === "number" ? value.maxValue : undefined;
  const single = typeof value.value === "number" ? value.value : undefined;

  const rawParts = [currency, min ?? single, max].filter((v) => v !== undefined);
  const salaryRawText = rawParts.length > 0 ? rawParts.join(" ") : undefined;

  return {
    salaryMin: min ?? single,
    salaryMax: max ?? single,
    salaryCurrency: currency,
    salaryPeriod: period,
    salaryRawText,
  };
}

function extractSkills(node: JsonLdNode): string[] | undefined {
  const raw = node.skills;
  if (!raw) return undefined;
  if (Array.isArray(raw)) return raw.map(String).map((s) => s.trim()).filter(Boolean);
  if (typeof raw === "string") {
    return raw
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return undefined;
}

export const jsonLdJobPostingParser: JobParser = {
  name: "json-ld-jobposting",

  canHandle(ctx: ParseContext) {
    return ctx.$('script[type="application/ld+json"]').length > 0;
  },

  extract(ctx: ParseContext) {
    const scripts = ctx.$('script[type="application/ld+json"]').toArray();
    for (const el of scripts) {
      const raw = ctx.$(el).contents().text();
      if (!raw?.trim()) continue;
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        continue;
      }
      const nodes = findJobPostingNodes(parsed);
      if (nodes.length === 0) continue;

      const node = nodes[0];
      const fields: ExtractedJobFields = {
        positionName: typeof node.title === "string" ? node.title.trim() : undefined,
        companyName:
          typeof node.hiringOrganization?.name === "string"
            ? node.hiringOrganization.name.trim()
            : undefined,
        location: extractLocation(node),
        workMode: extractWorkMode(node),
        skills: extractSkills(node),
        ...extractSalary(node),
      };

      if (fields.salaryRawText) {
        const structured = parseSalary(fields.salaryRawText);
        fields.salaryMin ??= structured.min;
        fields.salaryMax ??= structured.max;
        fields.salaryCurrency ??= structured.currency;
        fields.salaryPeriod ??= structured.period;
      }

      return fields;
    }
    return null;
  },
};
