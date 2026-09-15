import { requireUser } from "@/server/auth/session";
import { listDocumentsForUser } from "@/server/db/queries/documents";
import { QuickAddClient } from "@/components/jobs/quick-add-client";

/**
 * Deliberately its own top-level route rather than living under `(app)`:
 * it needs to render *without* that layout's nav header so it fits the
 * small popup window the bookmarklet opens it in (see
 * `settings/bookmarklet/page.tsx`). Still requires auth like everything
 * else — `requireUser()` redirects to `/login` the same way.
 */
export default async function QuickAddPage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string }>;
}) {
  const user = await requireUser();
  const { url } = await searchParams;
  const documents = await listDocumentsForUser(user.id);

  return (
    <div className="flex min-h-dvh items-start justify-center bg-muted/30 px-4 py-8">
      <div className="w-full max-w-lg rounded-xl border bg-popover p-5 shadow-sm">
        <QuickAddClient url={url} documents={documents} />
      </div>
    </div>
  );
}
