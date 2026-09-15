import { BookmarkletLink } from "@/components/jobs/bookmarklet-link";

function buildBookmarklet(origin: string) {
  const js = `(function(){window.open('${origin}/jobs/new?url='+encodeURIComponent(location.href),'_blank')})();`;
  return `javascript:${encodeURIComponent(js)}`;
}

export default function BookmarkletPage() {
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const href = buildBookmarklet(origin);

  return (
    <div className="flex max-w-[480px] flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Bookmarklet</h1>
        <p className="text-sm text-muted-foreground">
          Drag the button below to your bookmarks bar. On any job listing page, click it to
          capture the URL and open a pre-filled review form here — no copy/paste needed.
        </p>
      </div>
      <div className="rounded-lg border p-6 text-center">
        <BookmarkletLink href={href} />
        <p className="mt-3 text-xs text-muted-foreground">
          (Clicking this link here does nothing — it only works once dragged to your bookmarks
          bar.)
        </p>
      </div>
      <p className="text-xs text-muted-foreground">
        This relies on you already being signed in to Job Tracker in this browser.
      </p>
    </div>
  );
}
