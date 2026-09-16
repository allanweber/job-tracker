# Job Tracker

A personal job-application tracker with a kanban pipeline. Paste a job posting
URL and its Position, Company, Location, Work Mode, Salary, and Main Skills
are scraped automatically — no manual retyping.

## Stack

Next.js (App Router) · TypeScript · PostgreSQL · Drizzle ORM · Better Auth
(Google/GitHub OAuth) · Tailwind + shadcn/ui · dnd-kit · Cloudflare R2 ·
Playwright (scrape fallback) · pnpm

## Local development

1. **Start a local Postgres:**
   ```
   docker compose -f docker-compose.dev.yml up -d
   ```
2. **Copy the env file and fill in real values:**
   ```
   cp .env.example .env.local
   ```
   - `BETTER_AUTH_SECRET`: generate with `openssl rand -hex 32`
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`: see [OAuth setup](#oauth-setup) below
   - `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`: see [OAuth setup](#oauth-setup) below
   - `R2_*`: see [Document storage setup](#document-storage-setup) below — optional
     until you want to test resume/cover-letter uploads
3. **Install dependencies and apply the schema:**
   ```
   pnpm install
   pnpm db:generate   # only needed after changing src/server/db/schema/*
   pnpm db:migrate
   ```
4. **Run it:**
   ```
   pnpm dev
   ```
   → http://localhost:3005

## OAuth setup

Both providers need their callback URL set to:
`{NEXT_PUBLIC_APP_URL}/api/auth/callback/{provider}` (e.g.
`http://localhost:3005/api/auth/callback/google` for local dev).

- **Google**: [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
  → Create Credentials → OAuth client ID → Web application → add the callback
  URL above under "Authorized redirect URIs".
- **GitHub**: [github.com/settings/developers](https://github.com/settings/developers)
  → New OAuth App → set "Authorization callback URL" to the URL above.

## Document storage setup (Cloudflare R2)

1. Create a bucket in the [Cloudflare dashboard](https://dash.cloudflare.com/) → R2.
2. Create an API token scoped to that bucket (Object Read & Write).
3. Fill in `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`,
   `R2_BUCKET_NAME`, `R2_ENDPOINT` (`https://<account_id>.r2.cloudflarestorage.com`).

The bucket stays private — the app only ever hands out short-lived presigned
upload/download URLs.

## Quick-add: bookmarklet & browser extension

Two ways to capture a job listing without switching to the app first, both opening the same
`/quick-add` popup pre-filled with the current page's URL — set up from `/settings/bookmarklet`
and `/settings/extension` respectively once the app is running.

- **Bookmarklet** — zero install, but browsers can't show a custom favicon for a `javascript:`
  bookmark (there's no page to fetch an icon from), so it shows a generic icon in the bookmarks
  bar.
- **Browser extension** (`extension/`) — same popup, as a real toolbar button with the app's
  actual icon. Not published to any store; loaded unpacked (`chrome://extensions` → Developer
  mode → Load unpacked → select `extension/`). See `extension/README.md`.

## Testing

```
pnpm test        # unit tests for the scraper parsers + salary parser
pnpm lint
pnpm exec tsc --noEmit
```

Scraper tests run against saved HTML fixtures in `tests/fixtures/html/` — no
network access needed. When a real site starts mis-parsing, save a trimmed
copy of its HTML there and add a case, rather than only fixing the regex/logic.

## Deploying (Dokploy)

The app is a single Dockerfile deploy — Dokploy builds and runs it directly
from the git repo.

1. **Push this repo to GitHub** and connect it as a Dokploy application
   (Dockerfile build type).
2. **Build argument** — set in Dokploy's build settings:
   - `NEXT_PUBLIC_APP_URL` — the app's real public URL (e.g.
     `https://jobs.example.com`). This gets inlined into the client bundle at
     build time, so it must be correct *before* building, not just set as a
     runtime env var.
3. **Runtime environment variables** — set in Dokploy's environment settings
   (see `.env.example` for the full list): `DATABASE_URL` (point at a Postgres
   instance provisioned in Dokploy — dedicated to this app), `BETTER_AUTH_SECRET`,
   `NEXT_PUBLIC_APP_URL` (same value as the build arg), the OAuth credentials
   (with their callback URLs updated to the production domain), and the R2
   credentials.
4. **Enable git-based auto-deploy** on the Dokploy application so pushes to
   the branch trigger a rebuild + redeploy automatically. Database migrations
   run automatically as part of container startup (`docker-entrypoint.sh`) —
   no manual migration step needed on deploy.

### Alternative: Compose deploy with a Cloudflare Tunnel

`docker-compose.yml` deploys the same image as a Dokploy "Compose"
application alongside a `cloudflared` sidecar, so the app is never exposed on
a host port — Cloudflare reaches it over the private compose network.

1. Create a tunnel in the Cloudflare Zero Trust dashboard, point its public
   hostname at `http://app:3000`, and copy its token.
2. In Dokploy's Environment tab for the compose app, set the same runtime
   variables as above plus `TUNNEL_TOKEN` (the tunnel token from step 1).
   `NEXT_PUBLIC_APP_URL` is passed through as a build arg automatically.
3. Optionally set `CLOUDFLARED_VERSION` to pin a different `cloudflared`
   image tag (defaults to `2024.12.2`).

### Note on the runtime image

The production image is built from Playwright's own base image
(`mcr.microsoft.com/playwright`), which bundles Chromium and its OS
dependencies — this makes the image large (multi-hundred MB), which is an
accepted trade-off for a single self-hosted instance rather than a
size-sensitive serverless deploy.

## Architecture notes

- `src/app/**` — routes/UI only. All DB access and business logic lives under
  `src/server/**`.
- `src/server/scraping/**` — the tiered scraper (plain fetch → Playwright
  fallback → logged failure), with zero Next.js imports so it's directly
  unit-testable. See `src/server/scraping/orchestrator.ts` for the entry point
  and `src/server/scraping/parsers/` for the pluggable parser registry
  (schema.org JSON-LD first, then LinkedIn-specific, then a generic
  OpenGraph/meta fallback).
- Failed scrapes are logged to the `scrape_failures` table, visible at
  `/admin/scrape-failures` — use it to spot which sites need a new parser.
- `src/server/db/migrate.ts` is a standalone, separately-compiled
  (`pnpm build:migrate`) migration runner used only at container startup — it
  deliberately avoids the `drizzle-kit` CLI at runtime, since its
  pnpm-symlinked `node_modules` layout doesn't survive being copied into the
  slim Docker image.
