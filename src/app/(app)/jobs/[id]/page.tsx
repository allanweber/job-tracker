import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/server/auth/session";
import { getJobForUser } from "@/server/db/queries/jobs";
import { listDocumentsForUser } from "@/server/db/queries/documents";
import { db } from "@/server/db";
import { jobTags, tags } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { JobReviewForm } from "@/components/jobs/job-review-form";
import { Button } from "@/components/ui/button";
import { deleteJob } from "@/server/actions/jobs";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const [job, documents, jobTagRows] = await Promise.all([
    getJobForUser(user.id, id),
    listDocumentsForUser(user.id),
    db
      .select({ name: tags.name })
      .from(jobTags)
      .innerJoin(tags, eq(tags.id, jobTags.tagId))
      .where(eq(jobTags.jobId, id)),
  ]);

  if (!job) notFound();

  async function handleDelete() {
    "use server";
    await deleteJob(id);
    redirect("/board");
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Edit job</h1>
        <form action={handleDelete}>
          <Button type="submit" variant="destructive" size="sm">
            Delete
          </Button>
        </form>
      </div>
      <JobReviewForm
        initialValues={{
          id: job.id,
          sourceUrl: job.sourceUrl,
          positionName: job.positionName ?? "",
          companyName: job.companyName ?? "",
          location: job.location ?? "",
          workMode: job.workMode,
          salaryMin: job.salaryMin,
          salaryMax: job.salaryMax,
          salaryCurrency: job.salaryCurrency ?? "",
          salaryPeriod: job.salaryPeriod,
          salaryRawText: job.salaryRawText ?? "",
          skills: job.skills,
          tags: jobTagRows.map((r) => r.name),
          notes: job.notes ?? "",
          followUpDate: job.followUpDate ?? "",
          contactPerson: job.contactPerson ?? "",
          resumeDocumentId: job.resumeDocumentId,
          coverLetterDocumentId: job.coverLetterDocumentId,
        }}
        documents={documents}
      />
    </div>
  );
}
