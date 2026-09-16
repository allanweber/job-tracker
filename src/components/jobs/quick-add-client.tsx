"use client";

import { useState } from "react";
import { QuickAddSummary } from "@/components/jobs/quick-add-summary";

type Status = "idle" | "saved" | "canceled";

/**
 * The bookmarklet/extension's destination — deliberately outside the
 * `(app)` layout (no nav header, no sidebar) so it reads as a small
 * standalone dialog when opened in the compact popup window
 * `settings/bookmarklet/page.tsx` (and the extension's `background.js`)
 * build, rather than the full app shell crammed into a tiny window.
 */
export function QuickAddClient({ url }: { url?: string }) {
  const [status, setStatus] = useState<Status>("idle");

  // `window.close()` only works here at all because the browser sees this
  // window's history as a single, script-created entry (true for both the
  // bookmarklet's `window.open()` popup and the extension's
  // `chrome.windows.create()` one) — browsers otherwise refuse to let a
  // page close a window the user opened themselves. Even so, it isn't
  // guaranteed across every browser/version, so both outcomes always show
  // a terminal status screen with its own "you can close this" fallback —
  // Cancel used to just call `window.close()` and show nothing else, which
  // left it looking broken whenever the close didn't actually happen. The
  // brief delay lets that status screen actually flash on screen first
  // (an immediate close would otherwise likely win the race and skip
  // straight past it) before the close attempt.
  function closeWith(next: Status) {
    setStatus(next);
    setTimeout(() => window.close(), 500);
  }

  const handleSaved = () => closeWith("saved");
  const handleCancel = () => closeWith("canceled");

  if (status === "saved") {
    return (
      <div className="flex flex-col items-center gap-1 py-10 text-center">
        <p className="text-lg font-medium">✅ Saved</p>
        <p className="text-sm text-muted-foreground">You can close this window now.</p>
      </div>
    );
  }

  if (status === "canceled") {
    return (
      <div className="flex flex-col items-center gap-1 py-10 text-center">
        <p className="text-lg font-medium">Canceled</p>
        <p className="text-sm text-muted-foreground">
          Nothing was saved. You can close this window now.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold">Add job</h1>
      <QuickAddSummary key={url} url={url} onSaved={handleSaved} onCancel={handleCancel} />
    </div>
  );
}
