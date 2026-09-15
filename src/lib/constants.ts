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
