"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { jobs } from "@/server/db/schema";
import { requireUser } from "@/server/auth/session";
import { jobFormSchema } from "@/lib/validation/job.schema";
import { syncJobTags } from "@/server/db/queries/tags";
import { nextTopBoardOrder } from "@/server/db/queries/jobs";
import type { Stage } from "@/lib/constants";

function toNullable<T>(v: T | undefined): T | null {
  return v === undefined || v === "" ? null : v;
}

export async function saveJob(values: unknown) {
  const user = await requireUser();
  const parsed = jobFormSchema.parse(values);

  const jobValues = {
    userId: user.id,
    sourceUrl: parsed.sourceUrl,
    positionName: parsed.positionName,
    companyName: parsed.companyName,
    location: toNullable(parsed.location ?? undefined),
    workMode: toNullable(parsed.workMode ?? undefined),
    salaryMin: toNullable(parsed.salaryMin ?? undefined),
    salaryMax: toNullable(parsed.salaryMax ?? undefined),
    salaryCurrency: toNullable(parsed.salaryCurrency ?? undefined),
    salaryPeriod: toNullable(parsed.salaryPeriod ?? undefined),
    salaryRawText: toNullable(parsed.salaryRawText ?? undefined),
    skills: parsed.skills,
    notes: toNullable(parsed.notes ?? undefined),
    followUpDate: toNullable(parsed.followUpDate ?? undefined),
    contactPerson: toNullable(parsed.contactPerson ?? undefined),
    resumeDocumentId: toNullable(parsed.resumeDocumentId ?? undefined),
    coverLetterDocumentId: toNullable(parsed.coverLetterDocumentId ?? undefined),
    updatedAt: new Date(),
  };

  const jobId = await db.transaction(async (tx) => {
    if (parsed.id) {
      const [row] = await tx
        .update(jobs)
        .set(jobValues)
        .where(and(eq(jobs.id, parsed.id), eq(jobs.userId, user.id)))
        .returning({ id: jobs.id });
      if (!row) throw new Error("Job not found");
      await syncJobTags(tx, user.id, row.id, parsed.tags);
      return row.id;
    }

    const boardOrder = await nextTopBoardOrder(user.id, "wishlist");
    const [row] = await tx
      .insert(jobs)
      .values({ ...jobValues, stage: "wishlist", boardOrder })
      .returning({ id: jobs.id });
    await syncJobTags(tx, user.id, row.id, parsed.tags);
    return row.id;
  });

  revalidatePath("/board");
  redirect("/board");

  return jobId;
}

export async function moveJob(jobId: string, next: { stage: Stage; boardOrder: number }) {
  const user = await requireUser();
  await db
    .update(jobs)
    .set({ stage: next.stage, boardOrder: next.boardOrder, updatedAt: new Date() })
    .where(and(eq(jobs.id, jobId), eq(jobs.userId, user.id)));
  revalidatePath("/board");
}

export async function deleteJob(jobId: string) {
  const user = await requireUser();
  await db.delete(jobs).where(and(eq(jobs.id, jobId), eq(jobs.userId, user.id)));
  revalidatePath("/board");
}
