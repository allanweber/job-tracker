import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  doublePrecision,
  varchar,
  date,
  pgEnum,
  index,
  unique,
  primaryKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { user } from "./auth";
import { documents } from "./documents";

export const stageEnum = pgEnum("stage", [
  "wishlist",
  "applied",
  "interviewing",
  "offer",
  "rejected",
  "no_answer",
]);

export const workModeEnum = pgEnum("work_mode", ["remote", "hybrid", "onsite"]);

export const salaryPeriodEnum = pgEnum("salary_period", ["year", "hour"]);

export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    sourceUrl: text("source_url").notNull(),

    positionName: text("position_name"),
    companyName: text("company_name"),
    location: text("location"),
    workMode: workModeEnum("work_mode"),

    salaryMin: integer("salary_min"),
    salaryMax: integer("salary_max"),
    salaryCurrency: varchar("salary_currency", { length: 3 }),
    salaryPeriod: salaryPeriodEnum("salary_period"),
    salaryRawText: text("salary_raw_text"),

    skills: text("skills")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),

    notes: text("notes"),
    followUpDate: date("follow_up_date"),
    contactPerson: text("contact_person"),

    stage: stageEnum("stage").notNull().default("wishlist"),
    boardOrder: doublePrecision("board_order").notNull().default(0),

    resumeDocumentId: uuid("resume_document_id").references(() => documents.id, {
      onDelete: "set null",
    }),
    coverLetterDocumentId: uuid("cover_letter_document_id").references(
      () => documents.id,
      { onDelete: "set null" },
    ),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("jobs_user_stage_idx").on(t.userId, t.stage)],
);

export const jobStageHistory = pgTable(
  "job_stage_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    stage: stageEnum("stage").notNull(),
    changedAt: timestamp("changed_at").notNull().defaultNow(),
  },
  (t) => [index("job_stage_history_job_idx").on(t.jobId, t.changedAt)],
);

export const tags = pgTable(
  "tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
  },
  (t) => [
    unique("tags_user_name_unique").on(t.userId, t.name),
    index("tags_user_name_idx").on(t.userId, t.name),
  ],
);

export const jobTags = pgTable(
  "job_tags",
  {
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.jobId, t.tagId] })],
);
