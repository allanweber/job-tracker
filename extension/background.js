// Firefox implements the extension APIs natively as `browser.*` (Promise-
// based); `chrome.*` there is a callback-style compatibility alias that
// doesn't reliably return promises. Chrome only has `chrome.*`, but its MV3
// APIs do return promises when the callback is omitted — so preferring
// `browser` when present, `chrome` otherwise, gets promise-based calls on
// both without pulling in the full webextension-polyfill.
const api = typeof browser !== "undefined" ? browser : chrome;

// `config.js` sets the global `JOB_TRACKER_DEFAULT_APP_URL` — see
// scripts/generate-extension-config.mjs. Firefox already loaded it first
// via manifest's `background.scripts` array; Chrome's MV3 service worker
// only honors the single `service_worker` entry, so it needs an explicit
// `importScripts` here (only available in a worker context, hence the
// `typeof` guard rather than always calling it).
if (typeof importScripts === "function") importScripts("config.js");

// Background entry point: Chrome runs this as an MV3 service worker
// (manifest's `background.service_worker`); Firefox instead runs it as an
// event page (`background.scripts`) — same file, same event, either way.
// All it does is mirror the bookmarklet's popup: open
// `${appUrl}/quick-add?url=<current tab url>` in a small centered window.
// See src/app/(app)/settings/bookmarklet/page.tsx for the equivalent
// javascript: bookmarklet version of this same flow.
api.action.onClicked.addListener(async (tab) => {
  const { appUrl: storedAppUrl } = await api.storage.sync.get("appUrl");
  // A user-entered override (via Options) always wins over the baked-in
  // default, so switching instances doesn't require rebuilding the
  // extension.
  const appUrl = storedAppUrl || self.JOB_TRACKER_DEFAULT_APP_URL;

  if (!appUrl) {
    // No override saved and no default was baked in at build time (e.g.
    // NEXT_PUBLIC_APP_URL wasn't set when this was built) — send the user
    // to set their instance's URL instead of silently failing.
    api.runtime.openOptionsPage();
    return;
  }

  if (!tab.url) return;

  const origin = appUrl.replace(/\/+$/, "");
  const target = `${origin}/quick-add?url=${encodeURIComponent(tab.url)}`;

  // Background contexts have no `screen` global to center against (unlike
  // the bookmarklet, which runs in the page and can read screen.width/
  // height), so this uses a fixed size close to the bookmarklet's typical
  // popup instead of computing one. Sized for the compact quick-add summary
  // (source URL + position/company/location/work mode/salary + Save/
  // Cancel) — see QuickAddSummary — not the full in-app edit form.
  api.windows.create({
    url: target,
    type: "popup",
    width: 420,
    height: 600,
  });
});
