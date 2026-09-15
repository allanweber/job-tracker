"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

/**
 * React 19 defangs any `javascript:` URL passed through the `href` *prop*
 * — it can't tell a deliberately authored bookmarklet apart from
 * unsanitized data landing in `href`, so it replaces the whole thing with
 * a stub that just throws (the error the user is seeing). That check only
 * intercepts React's own prop diffing, not a plain DOM mutation, so the
 * real URL is set imperatively after mount instead.
 *
 * This is safe to bypass *here* specifically because `href` is never
 * derived from user/request input — see `buildBookmarklet` in
 * `settings/bookmarklet/page.tsx`, which builds it from a fixed app
 * origin and a fixed script body only. Do not reuse this pattern for a
 * URL that ever incorporates anything request-supplied.
 */
export function BookmarkletLink({ href }: { href: string }) {
  const anchorRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (anchorRef.current) anchorRef.current.href = href;
  }, [href]);

  return (
    <a
      ref={anchorRef}
      onClick={(e) => {
        // Clicking (rather than dragging) this link is a no-op by design —
        // it's meant to be dropped onto the bookmarks bar, not opened
        // directly — but a click that visibly does *nothing* reads as
        // broken. Say so instead of staying silent.
        e.preventDefault();
        toast.info("Drag this to your bookmarks bar — clicking it here doesn't do anything by itself.");
      }}
      className="inline-block cursor-grab rounded-md border bg-secondary px-4 py-2 text-sm font-medium active:cursor-grabbing"
    >
      📌 Add to Job Tracker
    </a>
  );
}
