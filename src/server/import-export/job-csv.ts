// Deliberately no `import "server-only"` here: this module is pure CSV <->
// job-shape mapping with no DB/filesystem/secret access (like
// `salary/parse-salary.ts` or `scraping/work-mode.ts`), so it's safe — and,
// for the shared validation schema, necessary — to import from either side.
import { buildCsv, parseCsv } from "@/lib/csv";
import { jobFormSchema, type JobFormValues } from "@/lib/validation/job.schema";
import {
  STAGES,
  STAGE_LABELS,
  WORK_MODES,
  WORK_MODE_LABELS,
  SALARY_PERIODS,
  type Stage,
  type WorkMode,
  type SalaryPeriod,
} from "@/lib/constants";
import type { JobWithTags } from "@/server/db/queries/jobs";

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

/** Column order for this app's own CSV export. Import recognizes these
 * exact headers (case-insensitively) plus a handful of synonyms used by
 * other trackers' exports — see `HEADER_ALIASES` below. */
export const JOB_CSV_HEADERS = [
  "Position",
  "Company",
  "Location",
  "Work Mode",
  "Stage",
  "Salary Min",
  "Salary Max",
  "Salary Currency",
  "Salary Period",
  "Salary Raw Text",
  "Skills",
  "Tags",
  "Notes",
  "Follow-up Date",
  "Contact Person",
  "Source URL",
  "Created At",
] as const;

/** Multi-value cells (skills, tags) are joined with "; " rather than "," so
 * they never need quoting just because a job has more than one skill. */
const LIST_SEPARATOR = "; ";

export function jobsToCsv(jobs: JobWithTags[]): string {
  const rows: string[][] = [[...JOB_CSV_HEADERS]];
  for (const job of jobs) {
    rows.push([
      job.positionName ?? "",
      job.companyName ?? "",
      job.location ?? "",
      job.workMode ? WORK_MODE_LABELS[job.workMode] : "",
      STAGE_LABELS[job.stage as Stage] ?? job.stage,
      job.salaryMin != null ? String(job.salaryMin) : "",
      job.salaryMax != null ? String(job.salaryMax) : "",
      job.salaryCurrency ?? "",
      job.salaryPeriod ?? "",
      job.salaryRawText ?? "",
      job.skills.join(LIST_SEPARATOR),
      job.tags.join(LIST_SEPARATOR),
      job.notes ?? "",
      job.followUpDate ?? "",
      job.contactPerson ?? "",
      job.sourceUrl,
      job.createdAt.toISOString(),
    ]);
  }
  return buildCsv(rows);
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

type MappedField =
  | "positionName"
  | "companyName"
  | "location"
  | "workMode"
  | "stage"
  | "salaryMin"
  | "salaryMax"
  | "salaryCurrency"
  | "salaryPeriod"
  | "salaryRawText"
  | "skills"
  | "tags"
  | "notes"
  | "followUpDate"
  | "contactPerson"
  | "sourceUrl"
  | "createdAt";

/** Recognized header text (normalized: trimmed, lowercased, whitespace
 * collapsed) mapped to the field it fills. Includes this app's own export
 * headers plus synonyms from other job-tracker exports (e.g. "Job Title",
 * "Status", "Job URL", "Min Salary" / "Max Salary", "Added Date") so a
 * spreadsheet exported elsewhere can be imported without renaming columns
 * first. Anything not listed here is *not* dropped — its column header and
 * value are folded into the imported job's Notes instead, so no data from
 * an unrecognized column is ever silently lost. */
const HEADER_ALIASES: Record<string, MappedField> = {
  position: "positionName",
  "position name": "positionName",
  "job title": "positionName",
  title: "positionName",
  company: "companyName",
  "company name": "companyName",
  employer: "companyName",
  location: "location",
  "work mode": "workMode",
  stage: "stage",
  status: "stage",
  "salary min": "salaryMin",
  "min salary": "salaryMin",
  "salary max": "salaryMax",
  "max salary": "salaryMax",
  "salary currency": "salaryCurrency",
  currency: "salaryCurrency",
  "salary period": "salaryPeriod",
  "salary raw text": "salaryRawText",
  salary: "salaryRawText",
  skills: "skills",
  tags: "tags",
  notes: "notes",
  "follow-up date": "followUpDate",
  "follow up date": "followUpDate",
  "contact person": "contactPerson",
  contact: "contactPerson",
  "source url": "sourceUrl",
  "job url": "sourceUrl",
  url: "sourceUrl",
  "created at": "createdAt",
  "added date": "createdAt",
  "date added": "createdAt",
};

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/\s+/g, " ");
}

function splitList(value: string): string[] {
  return value
    .split(/[;\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((v, i, arr) => arr.indexOf(v) === i);
}

/** Strips common formatting ($, commas, spaces) before parsing an integer.
 * Returns undefined if what's left isn't a plain non-negative integer. */
function parseMoney(raw: string): number | undefined {
  const cleaned = raw.replace(/[,$\s]/g, "");
  if (!/^\d+$/.test(cleaned)) return undefined;
  const n = Number(cleaned);
  return Number.isSafeInteger(n) ? n : undefined;
}

/** Matches free text against a fixed set of keys/labels, case-insensitively
 * and ignoring surrounding whitespace. */
function matchEnum<T extends string>(
  raw: string,
  keys: readonly T[],
  labels: Record<T, string>,
): T | undefined {
  const needle = raw.trim().toLowerCase();
  if (!needle) return undefined;
  for (const key of keys) {
    if (key.toLowerCase() === needle || labels[key].toLowerCase() === needle) return key;
  }
  return undefined;
}

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** True for strings that encode a specific instant (carry a time-of-day),
 * as opposed to a bare calendar date like "2026-09-03" or "Sep 3, 2026". */
function hasTimeComponent(raw: string): boolean {
  return /T\d{2}:\d{2}/.test(raw);
}

/** Parses a bare calendar-date string (no time-of-day) into its year/month
 * (0-indexed)/day, handling both "yyyy-mm-dd" and free text like "Sep 3,
 * 2026". Deliberately avoids `Date.parse(...).toISOString()`: for non-ISO
 * formats `Date.parse` interprets the string as *local* midnight, and
 * `toISOString()` then converts to UTC — which can shift the calendar date
 * by a day depending on the server's timezone. Reading the parts back out
 * with the local getters undoes exactly the interpretation `Date.parse`
 * applied, so the round trip is timezone-independent. */
function parseCalendarDate(raw: string): { year: number; month: number; day: number } | undefined {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (iso) return { year: Number(iso[1]), month: Number(iso[2]) - 1, day: Number(iso[3]) };

  const ms = Date.parse(raw);
  if (Number.isNaN(ms)) return undefined;
  const d = new Date(ms);
  return { year: d.getFullYear(), month: d.getMonth(), day: d.getDate() };
}

/** Accepts yyyy-mm-dd as-is; otherwise tries free text (e.g. "Sep 7, 2026")
 * and reformats to yyyy-mm-dd. Returns undefined if neither works. */
function parseDateCell(raw: string): string | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const parts = parseCalendarDate(trimmed);
  if (!parts) return undefined;
  return `${parts.year}-${pad2(parts.month + 1)}-${pad2(parts.day)}`;
}

export type ImportedJobRow = {
  /** Validated through the exact same `jobFormSchema` the manual job form
   * uses — `id` is always absent (import only ever creates jobs). */
  values: JobFormValues;
  /** Parsed from a "Created At"/"Added Date" column, if present and valid.
   * Lets a migrated job keep its original timeline instead of showing up as
   * created "today". */
  createdAt: Date | undefined;
};

export type ImportError = { row: number; reason: string };

export type ParseJobsCsvResult =
  | { ok: false; error: string }
  | { ok: true; rows: ImportedJobRow[]; errors: ImportError[] };

const MAX_ROWS = 2000;

export function parseJobsCsv(text: string): ParseJobsCsvResult {
  let matrix: string[][];
  try {
    matrix = parseCsv(text);
  } catch {
    return { ok: false, error: "Couldn't read that file as CSV." };
  }
  return parseJobsMatrix(matrix);
}

/** Shared by both import paths: `parseJobsCsv` (above) feeds it a matrix
 * parsed from CSV text, and the xlsx import path (`import-export.ts`, via
 * `xlsxToMatrix`) feeds it a matrix read straight from a spreadsheet's
 * cells — everything past "turn rows of strings into job candidates" is
 * identical (same header aliases, same per-row fallbacks, same
 * `jobFormSchema` validation) regardless of which file format it came from. */
export function parseJobsMatrix(rawMatrix: string[][]): ParseJobsCsvResult {
  // Drop fully-blank trailing/interstitial rows (e.g. a stray blank line at
  // the end of the file), which are common and not actual data.
  const matrix = rawMatrix.filter((r) => r.some((cell) => cell.trim() !== ""));

  if (matrix.length === 0) return { ok: false, error: "That file is empty." };

  const [headerRow, ...dataRows] = matrix;
  const fieldByColumn = headerRow.map((h) => HEADER_ALIASES[normalizeHeader(h)]);

  if (!fieldByColumn.includes("positionName") && !fieldByColumn.includes("companyName")) {
    return {
      ok: false,
      error:
        "Couldn't find a Position/Job Title or Company column — check the file has a header row.",
    };
  }

  if (dataRows.length > MAX_ROWS) {
    return { ok: false, error: `That file has more than ${MAX_ROWS} rows — please split it up.` };
  }

  const rows: ImportedJobRow[] = [];
  const errors: ImportError[] = [];

  dataRows.forEach((cells, i) => {
    const rowNumber = i + 2; // +1 for 0-index, +1 for the header row
    const byField = new Map<MappedField, string>();
    const notesFromUnmapped: string[] = [];

    headerRow.forEach((header, col) => {
      const value = (cells[col] ?? "").trim();
      if (!value) return;
      const field = fieldByColumn[col];
      if (field) {
        byField.set(field, value);
      } else {
        notesFromUnmapped.push(`${header.trim()}: ${value}`);
      }
    });

    const noteParts: string[] = [];

    const rawStage = byField.get("stage");
    let stage: Stage = "applied";
    if (rawStage) {
      const matched = matchEnum(rawStage, STAGES, STAGE_LABELS);
      if (matched) stage = matched;
      else noteParts.push(`Imported status: ${rawStage}`);
    }

    const rawWorkMode = byField.get("workMode");
    let workMode: WorkMode | null = null;
    if (rawWorkMode) {
      const matched = matchEnum(rawWorkMode, WORK_MODES, WORK_MODE_LABELS);
      if (matched) workMode = matched;
      else noteParts.push(`Imported work mode: ${rawWorkMode}`);
    }

    const rawSalaryPeriod = byField.get("salaryPeriod");
    let salaryPeriod: SalaryPeriod | null = null;
    if (rawSalaryPeriod) {
      const matched = matchEnum(
        rawSalaryPeriod,
        SALARY_PERIODS,
        { year: "year", hour: "hour" } as Record<SalaryPeriod, string>,
      );
      if (matched) salaryPeriod = matched;
      else noteParts.push(`Imported salary period: ${rawSalaryPeriod}`);
    }

    let salaryMin: number | null = null;
    const rawSalaryMin = byField.get("salaryMin");
    if (rawSalaryMin) {
      const parsed = parseMoney(rawSalaryMin);
      if (parsed !== undefined) salaryMin = parsed;
      else noteParts.push(`Salary min: ${rawSalaryMin}`);
    }

    let salaryMax: number | null = null;
    const rawSalaryMax = byField.get("salaryMax");
    if (rawSalaryMax) {
      const parsed = parseMoney(rawSalaryMax);
      if (parsed !== undefined) salaryMax = parsed;
      else noteParts.push(`Salary max: ${rawSalaryMax}`);
    }

    let followUpDate: string | null = null;
    const rawFollowUp = byField.get("followUpDate");
    if (rawFollowUp) {
      const parsed = parseDateCell(rawFollowUp);
      if (parsed) followUpDate = parsed;
      else noteParts.push(`Follow-up date (unrecognized): ${rawFollowUp}`);
    }

    let createdAt: Date | undefined;
    const rawCreatedAt = byField.get("createdAt");
    if (rawCreatedAt) {
      if (hasTimeComponent(rawCreatedAt)) {
        // A full instant (this app's own "Created At" export) — unambiguous,
        // no local-timezone reinterpretation needed.
        const ms = Date.parse(rawCreatedAt);
        if (!Number.isNaN(ms)) createdAt = new Date(ms);
        else noteParts.push(`Added date (unrecognized): ${rawCreatedAt}`);
      } else {
        // A bare calendar date (e.g. a legacy tracker's "Added Date") — pin
        // it to UTC midnight so the stored instant doesn't depend on the
        // server's timezone.
        const parts = parseCalendarDate(rawCreatedAt);
        if (parts) createdAt = new Date(Date.UTC(parts.year, parts.month, parts.day));
        else noteParts.push(`Added date (unrecognized): ${rawCreatedAt}`);
      }
    }

    const skills = byField.has("skills") ? splitList(byField.get("skills")!) : [];
    const tags = byField.has("tags") ? splitList(byField.get("tags")!) : [];

    const notes = [...noteParts, ...notesFromUnmapped, byField.get("notes") ?? ""]
      .filter(Boolean)
      .join("\n");

    const candidate = {
      sourceUrl: byField.get("sourceUrl") ?? "",
      positionName: byField.get("positionName") ?? "",
      companyName: byField.get("companyName") ?? "",
      location: byField.get("location") ?? null,
      workMode,
      salaryMin,
      salaryMax,
      salaryCurrency: byField.get("salaryCurrency") ?? null,
      salaryPeriod,
      salaryRawText: byField.get("salaryRawText") ?? null,
      skills,
      tags,
      notes: notes || null,
      followUpDate,
      contactPerson: byField.get("contactPerson") ?? null,
      stage,
    };

    // Reuse the exact same validation the manual job form uses — every
    // field an imported row can set goes through the same zod schema
    // (shape, length, and URL/scheme checks) as one typed by hand.
    const parsed = jobFormSchema.safeParse(candidate);
    if (!parsed.success) {
      const reason = parsed.error.issues.map((iss) => iss.message).join("; ");
      errors.push({ row: rowNumber, reason });
      return;
    }

    rows.push({ values: parsed.data, createdAt });
  });

  return { ok: true, rows, errors };
}
