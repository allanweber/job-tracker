import type { NextRequest } from "next/server";
import { requireUser } from "@/server/auth/session";
import { getJobsForUser } from "@/server/db/queries/jobs";
import { jobsToCsv } from "@/server/import-export/job-csv";

/** Downloads the signed-in user's jobs as CSV, or (with `?template=1`) just
 * the header row, to fill in and import. A Route Handler rather than a
 * Server Action because a file download needs a raw `Response` with custom
 * `Content-Type`/`Content-Disposition` headers, which actions can't return. */
export async function GET(request: NextRequest) {
  const user = await requireUser();
  const isTemplate = request.nextUrl.searchParams.get("template") === "1";
  const jobs = isTemplate ? [] : await getJobsForUser(user.id);
  const csv = jobsToCsv(jobs);
  const filename = isTemplate
    ? "job-tracker-import-template.csv"
    : `job-tracker-export-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      // `filename*` (RFC 5987) alongside the plain `filename` so a browser
      // that ignores one falls back to the other; the plain one is
      // fixed/ASCII so it needs no encoding.
      "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
