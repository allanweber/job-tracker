import type { JobParser, ParseContext, ExtractedJobFields } from "../types";
import { parseSalary } from "../salary/parse-salary";
import { detectWorkMode } from "../work-mode";
import { extractSkillsFromText } from "../skills";
import { decodeHtmlEntities } from "../decode-entities";

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
  const place = Array.isArray(loc) ? loc[0] : loc;
  if (!place) return undefined;

  // Most feeds nest an Address object under `.address`, but some put the
  // address fields directly on the Place, and some just use a plain string.
  const address = place.address;
  if (typeof address === "string" && address.trim()) return address.trim();

  const addr = (typeof address === "object" && address) || place;
  const parts = [addr.addressLocality, addr.addressRegion, addr.addressCountry].filter(Boolean);
  if (parts.length > 0) return parts.join(", ");

  if (typeof place.name === "string" && place.name.trim()) return place.name.trim();
  return undefined;
}

/** Some ATS platforms (seen on Gupy) don't set the standard top-level
 * `jobLocationType` at all, and instead stash the same information as a
 * generic schema.org `additionalProperty` on the Place itself — e.g.
 * `jobLocation.additionalProperty: { "@type": "PropertyValue", "value": "TELECOMMUTE" }`. */
function additionalPropertyText(place: JsonLdNode | undefined): string | undefined {
  const raw = place?.additionalProperty;
  if (!raw) return undefined;
  const props = Array.isArray(raw) ? raw : [raw];
  const text = props
    .map((p) => (typeof p?.value === "string" ? p.value : ""))
    .filter(Boolean)
    .join(" ");
  return text || undefined;
}

function extractWorkMode(node: JsonLdNode, location: string | undefined): ExtractedJobFields["workMode"] {
  // Free-text scan first: `jobLocationType` can only ever express
  // "TELECOMMUTE" (or nothing) per the schema.org spec, so it has no way to
  // signal "hybrid" — an explicit mention in the title/description is a
  // stronger, more specific signal than the structured field's absence.
  const description =
    typeof node.description === "string" ? node.description.replace(/<[^>]+>/g, " ") : undefined;
  const detected = detectWorkMode(node.title, location, description);
  if (detected) return detected;

  const type = node.jobLocationType;
  if (typeof type === "string" && /telecommute|remote/i.test(type)) return "remote";
  // schema.org's documented pattern for a remote-anywhere-within-region role:
  // eligible countries listed here instead of (or alongside) a fixed jobLocation.
  if (node.applicantLocationRequirements) return "remote";

  const place = Array.isArray(node.jobLocation) ? node.jobLocation[0] : node.jobLocation;
  const fromAdditionalProperty = detectWorkMode(additionalPropertyText(place));
  if (fromAdditionalProperty) return fromAdditionalProperty;

  return undefined;
}

function extractSkills(node: JsonLdNode): string[] | undefined {
  const explicit = extractSkillsField(node);
  const description = typeof node.description === "string" ? node.description : undefined;
  const fromDescription = extractSkillsFromText(description);

  const merged = [...(explicit ?? [])];
  for (const skill of fromDescription) {
    if (!merged.some((s) => s.toLowerCase() === skill.toLowerCase())) merged.push(skill);
  }
  return merged.length > 0 ? merged : undefined;
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

function extractSkillsField(node: JsonLdNode): string[] | undefined {
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
        // Some sites (seen on Gupy) HTML-entity-encode the JSON-LD payload
        // itself — `&quot;@type&quot;:...` — which is invalid JSON as
        // written but parses fine once decoded.
        try {
          parsed = JSON.parse(decodeHtmlEntities(raw));
        } catch {
          continue;
        }
      }
      const nodes = findJobPostingNodes(parsed);
      if (nodes.length === 0) continue;

      const node = nodes[0];
      const location = extractLocation(node);
      const fields: ExtractedJobFields = {
        positionName: typeof node.title === "string" ? node.title.trim() : undefined,
        companyName:
          typeof node.hiringOrganization?.name === "string"
            ? node.hiringOrganization.name.trim()
            : undefined,
        location,
        workMode: extractWorkMode(node, location),
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
