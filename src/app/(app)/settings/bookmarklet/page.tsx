import { BookmarkletLink } from "@/components/jobs/bookmarklet-link";

function buildBookmarklet(origin: string) {
  // Opens `/quick-add` (a deliberately chrome-free route — see its own
  // comment) in a small, centered popup window sized like a dialog,
  // instead of a full new tab showing the whole app. `noopener` is kept
  // even though it means the browser won't reuse a same-named popup
  // across repeated clicks (per spec, `noopener` always forces a fresh
  // browsing context) — the tradeoff favors not handing the arbitrary
  // page this runs on a `window.opener` back-reference into our
  // authenticated app. Each popup closes itself a moment after a
  // successful save anyway, so clutter from not reusing one is minor and
  // short-lived.
  const js = `(function(){
    var u='${origin}/quick-add?url='+encodeURIComponent(location.href);
    var w=Math.min(420,screen.width-40);
    var h=Math.min(600,screen.height-80);
    var l=Math.round((screen.width-w)/2);
    var t=Math.round((screen.height-h)/2);
    window.open(u,'job-tracker-quick-add','popup=1,width='+w+',height='+h+',left='+l+',top='+t+',noopener');
  })();`;
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
          capture the URL in a small popup — no tab-switching, no copy/paste needed.
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
        This relies on you already being signed in to Job Tracker in this browser. Note: browsers
        show a generic icon for this in your bookmarks bar, since a <code>javascript:</code> link
        has no page to fetch a favicon from — see the{" "}
        <a href="/settings/extension" className="underline">
          browser extension
        </a>{" "}
        if you&apos;d rather have a real toolbar icon.
      </p>
    </div>
  );
}
