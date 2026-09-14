import { requireUser } from "@/server/auth/session";
import { listScrapeFailuresForUser } from "@/server/db/queries/scrape";
import { Badge } from "@/components/ui/badge";

export default async function ScrapeFailuresPage() {
  const user = await requireUser();
  const failures = await listScrapeFailuresForUser(user.id);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Scrape failure log</h1>
        <p className="text-sm text-muted-foreground">
          URLs that couldn&apos;t be auto-filled — candidates for a new site-specific parser.
        </p>
      </div>
      <div className="flex flex-col divide-y rounded-lg border">
        {failures.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">No failures logged yet.</p>
        )}
        {failures.map((f) => (
          <div key={f.id} className="flex flex-col gap-1 p-3 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{f.domain}</Badge>
              <Badge variant="secondary">{f.tierReached}</Badge>
              <span className="text-xs text-muted-foreground">
                {f.createdAt.toLocaleString()}
              </span>
            </div>
            <a
              href={f.url}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all text-blue-600 hover:underline dark:text-blue-400"
            >
              {f.url}
            </a>
            {f.errorReason && <p className="text-muted-foreground">{f.errorReason}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
