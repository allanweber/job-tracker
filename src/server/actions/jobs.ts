"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/server/db";
import { jobs, jobStageHistory } from "@/server/db/schema";
import { requireUser } from "@/server/auth/session";
import { jobFormSchema } from "@/lib/validation/job.schema";
import { syncJobTags } from "@/server/db/queries/tags";
import { nextTopBoardOrder } from "@/server/db/queries/jobs";
import { STAGE_ORDER, normalizeStage, type Stage } from "@/lib/constants";

function toNullable<T>(v: T | undefined): T | null {
  return v === undefined || v === "" ? null : v;
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Stages have a linear order — applied → interviewing → offer → rejected —
 * with "no_answer" standing apart from it entirely. Moving forward along
 * the ladder logs every rung passed through, not just the destination
 * (applied straight to offer logs interviewing too, since the application
 * did pass through it). Moving backward means the rungs above where it
 * lands were wrong, so those history rows are deleted rather than left as
 * stale noise. "no_answer" doesn't participate in any of that: reaching it
 * means whatever ladder progress existed no longer matters, so history
 * resets back to just "applied" plus this event; leaving it behaves like a
 * fresh single move to wherever it's going next.
 *
 * "rejected" is the one rung on the ladder that isn't a real progression
 * step — unlike offer (which does imply an interview happened), a rejection
 * can land after any stage without the applicant ever reaching the ones in
 * between. So moving forward *into* "rejected" only logs "rejected" itself,
 * never backfills the rungs before it (an applied→rejected job never
 * interviewed; an interviewing→rejected job never got an offer).
 */
async function recordStageChange(tx: Tx, jobId: string, fromStage: Stage, toStage: Stage) {
  // A no-op transition must never touch history — every caller is expected
  // to already guard this, but this makes it a hard invariant of the
  // function itself rather than trusting every call site forever.
  if (fromStage === toStage) return;

  if (toStage === "no_answer" || fromStage === "no_answer") {
    if (toStage === "no_answer") {
      await tx
        .delete(jobStageHistory)
        .where(and(eq(jobStageHistory.jobId, jobId), ne(jobStageHistory.stage, "applied")));
    }
    await tx.insert(jobStageHistory).values({ jobId, stage: toStage });
    return;
  }

  const fromIndex = STAGE_ORDER.indexOf(fromStage);
  const toIndex = STAGE_ORDER.indexOf(toStage);

  if (toIndex > fromIndex) {
    const passedThrough = toStage === "rejected" ? [toStage] : STAGE_ORDER.slice(fromIndex + 1, toIndex + 1);
    await tx.insert(jobStageHistory).values(passedThrough.map((stage) => ({ jobId, stage })));
  } else {
    const invalidated = STAGE_ORDER.slice(toIndex + 1);
    await tx
      .delete(jobStageHistory)
      .where(and(eq(jobStageHistory.jobId, jobId), inArray(jobStageHistory.stage, invalidated)));
  }
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
      const [existing] = await tx
        .select({ stage: jobs.stage })
        .from(jobs)
        .where(and(eq(jobs.id, parsed.id), eq(jobs.userId, user.id)));
      if (!existing) throw new Error("Job not found");

      // The form's Status select is the only way to change stage outside
      // drag-and-drop — only recompute `boardOrder` (top of the target
      // column) when it's actually moving to a different stage, so an
      // edit that leaves the stage alone can't disturb its position in
      // the current column.
      const stageChanged = existing.stage !== parsed.stage;

      const [row] = await tx
        .update(jobs)
        .set({
          ...jobValues,
          stage: parsed.stage,
          ...(stageChanged ? { boardOrder: await nextTopBoardOrder(user.id, parsed.stage) } : {}),
        })
        .where(and(eq(jobs.id, parsed.id), eq(jobs.userId, user.id)))
        .returning({ id: jobs.id });
      if (!row) throw new Error("Job not found");
      await syncJobTags(tx, user.id, row.id, parsed.tags);
      if (stageChanged) {
        await recordStageChange(tx, row.id, normalizeStage(existing.stage), parsed.stage);
      }
      return row.id;
    }

    const boardOrder = await nextTopBoardOrder(user.id, "applied");
    const [row] = await tx
      .insert(jobs)
      .values({ ...jobValues, stage: "applied", boardOrder })
      .returning({ id: jobs.id });
    await syncJobTags(tx, user.id, row.id, parsed.tags);
    await tx.insert(jobStageHistory).values({ jobId: row.id, stage: "applied" });
    return row.id;
  });

  revalidatePath("/board");

  // Deliberately no server-side `redirect()` here: this action is called
  // from both the standalone /jobs/new and /jobs/[id] pages and from the
  // add/edit modal (an intercepted parallel route). A `redirect()` doesn't
  // reliably clear the modal's parallel-route slot, so the caller navigates
  // client-side instead — see JobReviewForm's `handleSubmit`.
  return jobId;
}

export async function moveJob(jobId: string, next: { stage: Stage; boardOrder: number }) {
  const user = await requireUser();
  await db.transaction(async (tx) => {
    // dnd-kit calls this both for an actual column change and for a plain
    // reorder within the same column — only the former is a real stage
    // transition worth logging, so read the current stage first.
    const [existing] = await tx
      .select({ stage: jobs.stage })
      .from(jobs)
      .where(and(eq(jobs.id, jobId), eq(jobs.userId, user.id)));
    if (!existing) return;

    await tx
      .update(jobs)
      .set({ stage: next.stage, boardOrder: next.boardOrder, updatedAt: new Date() })
      .where(and(eq(jobs.id, jobId), eq(jobs.userId, user.id)));

    if (existing.stage !== next.stage) {
      await recordStageChange(tx, jobId, normalizeStage(existing.stage), next.stage);
    }
  });
  revalidatePath("/board");
}

export async function deleteJob(jobId: string) {
  const user = await requireUser();
  await db.delete(jobs).where(and(eq(jobs.id, jobId), eq(jobs.userId, user.id)));
  revalidatePath("/board");
}
