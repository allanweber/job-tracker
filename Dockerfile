# syntax=docker/dockerfile:1

# --- deps: full install (incl. devDependencies), needed for the build stage ---
FROM node:22-bookworm-slim AS deps
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# --- runtime-deps: production-only install for the runtime image.
# Next's standalone output only bundles what its own tracer inlines into
# compiled routes — a plain `require()` from our separately-compiled
# migrate.js (not part of Next's build) needs a real node_modules to resolve
# `postgres`/`drizzle-orm` against, hence this separate prod-only tree. ---
FROM node:22-bookworm-slim AS runtime-deps
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod

# --- builder: compile the Next.js app + the standalone migration script ---
FROM node:22-bookworm-slim AS builder
RUN corepack enable
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* vars are inlined into the client bundle at build time, so the
# real public URL must be passed as a build arg (configure this in Dokploy's
# build settings). The other two only need to be non-empty strings to satisfy
# module-init checks during Next's page-data collection — the real values are
# injected as runtime env vars by Dokploy and take over from these.
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
ENV DATABASE_URL="postgres://build:build@localhost:5432/build"
ENV BETTER_AUTH_SECRET="build-time-placeholder"

RUN pnpm build
RUN pnpm build:migrate

# --- runner: Playwright's own image ships Chromium + all its OS deps ---
FROM mcr.microsoft.com/playwright:v1.63.0-noble AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/.next/standalone ./
COPY --from=runtime-deps /app/node_modules ./node_modules
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/dist ./dist
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 3000
ENV PORT=3000
ENTRYPOINT ["./docker-entrypoint.sh"]
