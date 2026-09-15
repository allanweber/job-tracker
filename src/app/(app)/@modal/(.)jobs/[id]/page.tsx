import { notFound } from "next/navigation";
import { requireUser } from "@/server/auth/session";
import { getJobEditValues } from "@/server/db/queries/jobs";
import { listDocumentsForUser } from "@/server/db/queries/documents";
import { JobEditModal } from "@/components/jobs/job-edit-modal";

export default async function InterceptedJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const [job, documents] = await Promise.all([
    getJobEditValues(user.id, id),
    listDocumentsForUser(user.id),
  ]);

  if (!job) notFound();

  return <JobEditModal job={job} documents={documents} />;
}
