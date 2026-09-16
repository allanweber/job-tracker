# Job Tracker Quick Add (browser extension)

Does the same thing as the [bookmarklet](../src/app/(app)/settings/bookmarklet/page.tsx) —
click it on any job listing page to open Job Tracker's "add job" popup pre-filled with the
current URL — but as a real Manifest V3 extension instead of a `javascript:` bookmark. The
motivation is favicon-only: browsers can't show a custom icon for a `javascript:` bookmark
(there's no navigable URL to fetch a favicon for), but an extension's toolbar button icon is
just a file it declares, so it reliably shows the Job Tracker mark instead of a generic icon.

It works against **your own** Job Tracker instance — there's no hosted/multi-tenant service
behind it. Its URL isn't something you type in by hand: `pnpm ext:build`/`ext:lint`/`ext:sign`
(and, for local dev, `pnpm dev`/`pnpm build`) all regenerate `extension/config.js` from
`NEXT_PUBLIC_APP_URL` first — see `scripts/generate-extension-config.mjs` — the same env var you
already set to build the app itself, so the extension just knows its target with zero extra
setup. Its Options page still exists purely as an override, for the rare case you want a single
build pointed at a different instance than it was built for. The bookmarklet remains the
zero-install option; this one trades a one-time install step for a real, always-present toolbar
icon.

## Using an already-published build

Once this has actually been submitted and approved (see *Publishing* below), install it the
normal way:

- **Chrome / Edge:** from the Chrome Web Store listing (Edge can install Chrome Web Store
  extensions directly).
- **Firefox:** from its AMO listing, or the signed `.xpi` if it was self-distributed unlisted.

Click the toolbar icon and go — it already knows your instance's URL, baked in at whatever
`NEXT_PUBLIC_APP_URL` was when the build you installed was published.

## Developing / trying it before it's published

Run `pnpm ext:build` once first (regenerates `extension/config.js` from your `.env.local`'s
`NEXT_PUBLIC_APP_URL`, then packages the folder — packaging isn't required for loading unpacked,
but running it this way is the easiest way to get `config.js` regenerated).

**Chrome / Edge:**

1. Open `chrome://extensions` (or `edge://extensions`) and turn on **Developer mode**.
2. Click **Load unpacked** and select this `extension/` folder.

**Firefox:**

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on…** and select `extension/manifest.json`.
3. This is discarded on every Firefox restart — fine for trying it, not for daily use. For a
   build that survives restarts without going through a store, see *Self-distribute on Firefox*
   below.

Either way, it's ready immediately — no Options step. Open a job listing page, click the toolbar
icon, it opens Job Tracker's quick-add popup for the current tab's URL — this relies on you
already being signed in to Job Tracker in this browser.

## Publishing

`package.json` has three scripts (all via Mozilla's official
[`web-ext`](https://github.com/mozilla/web-ext) CLI, already a devDependency) that operate on
this folder specifically (`--source-dir=extension`) and exclude the non-runtime files
(`icon.svg`, `generate.sh`, the `.md` docs) from the package:

```sh
pnpm ext:lint    # validates manifest.json against Chrome/Firefox store rules
pnpm ext:build   # → extension/dist/job_tracker_quick_add-<version>.zip
pnpm ext:sign    # Firefox only — see below; needs AMO API credentials
```

Run `ext:lint` after any manifest change — it catches most of what a store review would
otherwise reject.

### Chrome Web Store

1. Create a [developer account](https://chrome.google.com/webstore/devconsole) (one-time $5 fee)
   if you don't have one.
2. `pnpm ext:build`, then upload the resulting zip as a new item in the dashboard.
3. Fill in the store listing using [`STORE_LISTING.md`](./STORE_LISTING.md) (description,
   category, screenshots) and the "Privacy practices" tab (single purpose, permission
   justifications, and [`PRIVACY.md`](./PRIVACY.md)'s URL once it's live on `main`).
4. Submit for review (typically hours to a few days).

Microsoft Edge Add-ons accepts the same zip via
[Partner Center](https://partner.microsoft.com/dashboard/microsoftedge/overview) (free) — same
listing copy applies.

### Firefox Add-ons (AMO)

Two ways to get a permanently-installable signed build, both starting from an AMO account and
[API credentials](https://addons.mozilla.org/developers/addon/api/key/) (JWT issuer + secret):

- **Self-distribute (unlisted, not publicly searchable):**
  ```sh
  AMO_API_KEY=... AMO_API_SECRET=... pnpm ext:sign -- --api-key=$AMO_API_KEY --api-secret=$AMO_API_SECRET
  ```
  This uploads the build, waits for Mozilla's automated review, and downloads a signed `.xpi` to
  `extension/dist/` that installs permanently (drag it into Firefox, or `about:addons` → gear
  icon → *Install Add-on From File*) without appearing in AMO search.
- **List publicly on AMO:** submit the `ext:build` zip through the
  [Developer Hub](https://addons.mozilla.org/developers/) web UI instead — goes through full
  (possibly manual) review but gets discoverability via AMO search.

Regular release Firefox refuses to permanently install an unsigned extension outright — signing
via one of the two paths above isn't optional, it's how Firefox verifies self-distributed
extensions at all.

## Regenerating icons

`icons/icon.svg` is the source (the same kanban-columns mark as the web app's favicon,
`src/app/icon.tsx`); the PNGs both browsers actually read are generated from it:

```sh
extension/icons/generate.sh   # requires ImageMagick (`magick`/`convert`)
```
