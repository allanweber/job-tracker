import { requireUser } from "@/server/auth/session";
import { listDocumentsForUser } from "@/server/db/queries/documents";
import { DocumentUploader } from "@/components/documents/document-uploader";
import { DocumentRow } from "@/components/documents/document-row";

export default async function DocumentsPage() {
  const user = await requireUser();
  const docs = await listDocumentsForUser(user.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Documents</h1>
        <p className="text-sm text-muted-foreground">
          Upload a resume or cover letter once, then attach it to any job.
        </p>
      </div>
      <DocumentUploader />
      <div className="flex flex-col divide-y rounded-lg border">
        {docs.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">No documents uploaded yet.</p>
        )}
        {docs.map((doc) => (
          <DocumentRow key={doc.id} document={doc} />
        ))}
      </div>
    </div>
  );
}
