// The `stage` column also allows a legacy "wishlist" value at the database
// level (see server/db/schema/jobs.ts), but the board no longer surfaces it:
// every new job lands straight in "applied".
export const STAGES = ["applied", "interviewing", "offer", "rejected", "no_answer"] as const;

export type Stage = (typeof STAGES)[number];

export const STAGE_LABELS: Record<Stage, string> = {
  applied: "Applied",
  interviewing: "Interviewing",
  offer: "Offer",
  rejected: "Rejected",
  no_answer: "No Answer",
};

export const STAGE_COLORS: Record<Stage, string> = {
  applied: "#f59e0b",
  interviewing: "#8b5cf6",
  offer: "#22c55e",
  rejected: "#ef4444",
  no_answer: "#6b7280",
};

/** Linear ladder a job climbs (or falls back down) through. "no_answer" is
 * deliberately excluded — it's a standalone outcome, not a rung on this
 * ladder (see `recordStageChange` in server/actions/jobs.ts, which is what
 * actually uses this ordering to decide what stage-history to add/remove). */
export const STAGE_ORDER: Stage[] = ["applied", "interviewing", "offer", "rejected"];

/** The DB `stage` column still allows a legacy "wishlist" value the app no
 * longer surfaces — treat it as "applied" everywhere it's read. */
export function normalizeStage(stage: string): Stage {
  return stage === "wishlist" ? "applied" : (stage as Stage);
}

export const WORK_MODES = ["remote", "hybrid", "onsite"] as const;
export type WorkMode = (typeof WORK_MODES)[number];

export const WORK_MODE_LABELS: Record<WorkMode, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  onsite: "Onsite",
};

export const SALARY_PERIODS = ["year", "hour"] as const;
export type SalaryPeriod = (typeof SALARY_PERIODS)[number];

export const DOCUMENT_KINDS = ["resume", "cover_letter", "other"] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];
