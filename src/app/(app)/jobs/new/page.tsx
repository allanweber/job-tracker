import { requireUser } from "@/server/auth/session";
import { listDocumentsForUser } from "@/server/db/queries/documents";
import { ScrapeAndReview } from "@/components/jobs/scrape-and-review";
import { JobReviewForm } from "@/components/jobs/job-review-form";

export default async function NewJobPage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string }>;
}) {
  const user = await requireUser();
  const { url } = await searchParams;
  const documents = await listDocumentsForUser(user.id);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Add job</h1>
      {url ? (
        <ScrapeAndReview key={url} url={url} documents={documents} />
      ) : (
        <JobReviewForm initialValues={{ sourceUrl: "" }} documents={documents} />
      )}
    </div>
  );
}
