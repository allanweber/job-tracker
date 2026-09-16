"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AddJobBox } from "@/components/jobs/add-job-box";
import { PipelineStats } from "@/components/board/pipeline-stats";
import { KanbanBoard } from "@/components/board/kanban-board";
import { JobListView } from "@/components/board/job-list-view";
import { ImportResultsDialog } from "@/components/board/import-results-dialog";
import { importJobsFile } from "@/server/actions/import-export";
import type { ImportError } from "@/server/import-export/job-csv";
import { cn } from "cn";
import type { JobWithTags } from "@/server/db/queries/jobs";

type ViewMode = "columns" | "list";

export function BoardClient({ initialJobs }: { initialJobs: JobWithTags[] }) {
  const [jobs, setJobs] = useState(initialJobs);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<ViewMode>("columns");
  const [importing, setImporting] = useState(false);
  const [importErrors, setImportErrors] = useState<ImportError[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Jobs saved via the bookmarklet happen on /quick-add, a
  // *different* tab or popup window from this one — the server action there
  // revalidates the "/board" cache, but that doesn't push anything into an
  // already-open board tab. Instead, refresh whenever this tab regains focus
  // (the common case: the quick-add popup closes and hands focus back here)
  // or becomes visible again (switching back to this tab), so the newly
  // saved job shows up without the user having to reload manually.
  useEffect(() => {
    function refresh() {
      if (document.visibilityState === "visible") router.refresh();
    }
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router]);

  // Keep local state in sync whenever the server sends fresh data (e.g. after
  // a job was added/edited/deleted through the add/edit modal). Adjusting
  // state during render — rather than in an effect — avoids an extra
  // cascading render; see https://react.dev/learn/you-might-not-need-an-effect
  const [prevInitialJobs, setPrevInitialJobs] = useState(initialJobs);
  if (initialJobs !== prevInitialJobs) {
    setPrevInitialJobs(initialJobs);
    setJobs(initialJobs);
  }

  const visibleJobs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter((j) =>
      [j.positionName, j.companyName, j.location].some((field) =>
        (field ?? "").toLowerCase().includes(q),
      ),
    );
  }, [jobs, query]);

  function handleDeleted(id: string) {
    setJobs((prev) => prev.filter((j) => j.id !== id));
  }

  function handleDownloadTemplate() {
    window.open("/api/jobs/export?template=1", "_blank", "noopener,noreferrer");
  }

  function handleExport() {
    window.open("/api/jobs/export", "_blank", "noopener,noreferrer");
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setImporting(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const result = await importJobsFile(formData);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (result.imported > 0) {
        toast.success(`Imported ${result.imported} job${result.imported === 1 ? "" : "s"}`);
        router.refresh();
      }
      if (result.errors.length > 0) {
        setImportErrors(result.errors);
        if (result.imported === 0) {
          toast.error("Nothing could be imported — see details");
        } else {
          toast.warning(`${result.errors.length} row${result.errors.length === 1 ? "" : "s"} skipped`);
        }
      }
    } catch {
      toast.error("Import failed — please try again.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <PipelineStats jobs={jobs} />

      <AddJobBox />

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search by job title, company name, or location"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="min-w-56 flex-1"
        />
        <div className="flex overflow-hidden rounded-lg border">
          <button
            type="button"
            onClick={() => setView("columns")}
            className={cn(
              "px-3.5 py-1.5 text-[13px] font-medium",
              view === "columns" ? "bg-muted" : "bg-transparent hover:bg-muted/50",
            )}
          >
            Columns
          </button>
          <button
            type="button"
            onClick={() => setView("list")}
            className={cn(
              "border-l px-3.5 py-1.5 text-[13px] font-medium",
              view === "list" ? "bg-muted" : "bg-transparent hover:bg-muted/50",
            )}
          >
            List
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          className="hidden"
          onChange={handleImportFile}
        />
        <Popover>
          <PopoverTrigger
            render={<Button variant="outline" size="icon-sm" aria-label="More actions" />}
          >
            <MoreHorizontal className="size-4" />
          </PopoverTrigger>
          <PopoverContent align="end" className="w-44 p-1.5">
            <div className="flex flex-col">
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="rounded-md px-2.5 py-2 text-left text-sm hover:bg-muted"
              >
                Download template
              </button>
              <button
                type="button"
                disabled={importing}
                onClick={() => fileInputRef.current?.click()}
                className="rounded-md px-2.5 py-2 text-left text-sm hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
              >
                {importing ? "Importing…" : "Import"}
              </button>
              <button
                type="button"
                onClick={handleExport}
                className="rounded-md px-2.5 py-2 text-left text-sm hover:bg-muted"
              >
                Export
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {view === "list" ? (
        <JobListView jobs={visibleJobs} isFiltered={query.trim().length > 0} onDeleted={handleDeleted} />
      ) : (
        <KanbanBoard jobs={visibleJobs} setJobs={setJobs} onDeleted={handleDeleted} />
      )}

      <ImportResultsDialog errors={importErrors} onClose={() => setImportErrors(null)} />
    </div>
  );
}
