import { z } from "zod";
import { STAGES, WORK_MODES, SALARY_PERIODS } from "@/lib/constants";

export const jobFormSchema = z.object({
  id: z.uuid().optional(),
  // Restricted to http/https: zod's bare `z.url()` accepts any scheme,
  // including `javascript:`/`data:` URIs, which would be stored verbatim and
  // could execute if this field is ever rendered as a link's `href`.
  sourceUrl: z.url({ protocol: /^https?$/, error: "Enter a valid http(s) URL" }),
  positionName: z.string().trim().min(1, "Position is required"),
  companyName: z.string().trim().min(1, "Company is required"),
  location: z.string().trim().optional().nullable(),
  workMode: z.enum(WORK_MODES).optional().nullable(),

  salaryMin: z.coerce.number().int().nonnegative().optional().nullable(),
  salaryMax: z.coerce.number().int().nonnegative().optional().nullable(),
  salaryCurrency: z.string().trim().max(3).optional().nullable(),
  salaryPeriod: z.enum(SALARY_PERIODS).optional().nullable(),
  salaryRawText: z.string().trim().optional().nullable(),

  skills: z.array(z.string().trim().min(1)).default([]),
  tags: z.array(z.string().trim().min(1)).default([]),

  notes: z.string().trim().optional().nullable(),
  followUpDate: z.string().trim().optional().nullable(), // yyyy-mm-dd
  contactPerson: z.string().trim().optional().nullable(),

  stage: z.enum(STAGES).default("applied"),

  resumeDocumentId: z.uuid().optional().nullable(),
  coverLetterDocumentId: z.uuid().optional().nullable(),
});

export type JobFormValues = z.infer<typeof jobFormSchema>;
