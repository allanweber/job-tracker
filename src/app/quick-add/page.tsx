import { requireUser } from "@/server/auth/session";
import { QuickAddClient } from "@/components/jobs/quick-add-client";

/**
 * Deliberately its own top-level route rather than living under `(app)`:
 * it needs to render *without* that layout's nav header so it fits the
 * small popup window the bookmarklet/extension opens it in (see
 * `settings/bookmarklet/page.tsx` and `extension/background.js`). Still
 * requires auth like everything else — `requireUser()` redirects to
 * `/login` the same way, which is how signed-out visits here get prompted
 * to sign in before anything can be saved. It passes its own path (url
 * param included) through as `requireUser`'s `redirectTo`, so signing in
 * lands back on this same quick-add popup instead of the dashboard.
 */
export default async function QuickAddPage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string }>;
}) {
  const { url } = await searchParams;
  await requireUser(url ? `/quick-add?url=${encodeURIComponent(url)}` : "/quick-add");

  return (
    <div className="flex min-h-dvh items-start justify-center bg-muted/30 px-4 py-8">
      <div className="w-full max-w-lg rounded-xl border bg-popover p-5 shadow-sm">
        <QuickAddClient url={url} />
      </div>
    </div>
  );
}
