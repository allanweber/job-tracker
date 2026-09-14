import { z } from "zod";
import { STAGES, WORK_MODES, SALARY_PERIODS } from "@/lib/constants";

export const jobFormSchema = z.object({
  id: z.uuid().optional(),
  sourceUrl: z.url("Enter a valid URL"),
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

  stage: z.enum(STAGES).default("wishlist"),

  resumeDocumentId: z.uuid().optional().nullable(),
  coverLetterDocumentId: z.uuid().optional().nullable(),
});

export type JobFormValues = z.infer<typeof jobFormSchema>;
