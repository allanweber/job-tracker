import { requireUser } from "@/server/auth/session";
import { listDocumentsForUser } from "@/server/db/queries/documents";
import { JobNewModal } from "@/components/jobs/job-new-modal";

export default async function InterceptedNewJobPage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string }>;
}) {
  const user = await requireUser();
  const { url } = await searchParams;
  const documents = await listDocumentsForUser(user.id);

  return <JobNewModal url={url} documents={documents} />;
}
