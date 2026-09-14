export const STAGES = [
  "wishlist",
  "applied",
  "interviewing",
  "offer",
  "rejected",
  "no_answer",
] as const;

export type Stage = (typeof STAGES)[number];

export const STAGE_LABELS: Record<Stage, string> = {
  wishlist: "Wishlist",
  applied: "Applied",
  interviewing: "Interviewing",
  offer: "Offer",
  rejected: "Rejected",
  no_answer: "No Answer",
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
