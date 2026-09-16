"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WORK_MODES, WORK_MODE_LABELS } from "@/lib/constants";
import { formatSalary } from "@/lib/format-salary";
import { runScrapeForUrl } from "@/server/actions/scrape";
import { saveJob } from "@/server/actions/jobs";
import { jobFormSchema } from "@/lib/validation/job.schema";
import type { ExtractedJobFields } from "@/server/scraping/types";

type Fields = {
  sourceUrl: string;
  positionName: string;
  companyName: string;
  location: string;
  workMode: "" | "remote" | "hybrid" | "onsite";
  salary: string;
};

function emptyFields(sourceUrl: string): Fields {
  return {
    sourceUrl,
    positionName: "",
    companyName: "",
    location: "",
    workMode: "",
    salary: "",
  };
}

function fieldsFromExtracted(sourceUrl: string, extracted: ExtractedJobFields): Fields {
  return {
    sourceUrl,
    positionName: extracted.positionName ?? "",
    companyName: extracted.companyName ?? "",
    location: extracted.location ?? "",
    workMode: extracted.workMode ?? "",
    salary:
      formatSalary({
        salaryMin: extracted.salaryMin ?? null,
        salaryMax: extracted.salaryMax ?? null,
        salaryCurrency: extracted.salaryCurrency ?? null,
        salaryPeriod: extracted.salaryPeriod ?? null,
        salaryRawText: extracted.salaryRawText ?? null,
      }) ?? "",
  };
}

/**
 * The extension/bookmarklet's quick-add review step — a compact glance-and-
 * confirm summary of the scraped listing (source URL, position, company,
 * location, work mode, salary) with just Save/Cancel. Deliberately its own
 * component rather than reusing `ScrapeAndReview`/`JobReviewForm`, which
 * the in-app "Add job" modal also uses and which should keep its full
 * editing surface (skills, tags, files, notes, follow-up, contact).
 *
 * Only `positionName`/`companyName` are required to save (same as the full
 * form's schema) — everything else can be left blank and refined later on
 * the board.
 */
export function QuickAddSummary({
  url,
  onSaved,
  onCancel,
}: {
  url?: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [scrape, setScrape] = useState<"loading" | "ok" | "failed" | "none">(
    url ? "loading" : "none",
  );
  const [values, setValues] = useState<Fields>(emptyFields(url ?? ""));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!url) return;
    // No need to reset `scrape`/`values` to their loading state here: the
    // caller remounts this component (via `key={url}`) whenever `url`
    // changes, so the `useState` initializers above already cover it.
    let cancelled = false;
    runScrapeForUrl(url).then((result) => {
      if (cancelled) return;
      if (result.status === "ok") {
        setValues(fieldsFromExtracted(url, result.fields));
        setScrape("ok");
      } else {
        setScrape("failed");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [url]);

  function set<K extends keyof Fields>(key: K, value: Fields[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const parsed = jobFormSchema.safeParse({
      sourceUrl: values.sourceUrl,
      positionName: values.positionName,
      companyName: values.companyName,
      location: values.location,
      workMode: values.workMode || null,
      salaryRawText: values.salary,
    });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        fieldErrors[String(issue.path[0])] = issue.message;
      }
      setErrors(fieldErrors);
      toast.error("Please fix the highlighted fields.");
      return;
    }
    setErrors({});
    startTransition(async () => {
      try {
        await saveJob(parsed.data);
        onSaved();
      } catch {
        toast.error("Couldn't save that job — please try again.");
      }
    });
  }

  const actions = (
    <div className="mt-1 flex gap-2">
      <Button type="submit" disabled={pending || scrape === "loading"} className="flex-1">
        {pending ? "Saving…" : "Save"}
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={onCancel}
        disabled={pending}
        className="flex-1"
      >
        Cancel
      </Button>
    </div>
  );

  if (scrape === "loading") {
    return (
      <div className="flex flex-col gap-3">
        <p className="truncate text-xs text-muted-foreground" title={url}>
          {url}
        </p>
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        {actions}
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-3">
      {scrape === "failed" && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          Couldn&apos;t auto-fill this one — please fill in the details manually.
        </div>
      )}

      {url ? (
        <p className="truncate text-xs text-muted-foreground" title={url}>
          {url}
        </p>
      ) : (
        <div className="flex flex-col gap-1">
          <Label htmlFor="sourceUrl">Job URL</Label>
          <Input
            id="sourceUrl"
            type="url"
            value={values.sourceUrl}
            onChange={(e) => set("sourceUrl", e.target.value)}
          />
          {errors.sourceUrl && <p className="text-xs text-destructive">{errors.sourceUrl}</p>}
        </div>
      )}

      <div className="flex flex-col gap-1">
        <Label htmlFor="positionName">Position</Label>
        <Input
          id="positionName"
          value={values.positionName}
          onChange={(e) => set("positionName", e.target.value)}
          autoFocus
        />
        {errors.positionName && (
          <p className="text-xs text-destructive">{errors.positionName}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="companyName">Company</Label>
        <Input
          id="companyName"
          value={values.companyName}
          onChange={(e) => set("companyName", e.target.value)}
        />
        {errors.companyName && <p className="text-xs text-destructive">{errors.companyName}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            value={values.location}
            onChange={(e) => set("location", e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Work mode</Label>
          <Select
            value={values.workMode || "unset"}
            onValueChange={(v) => set("workMode", v === "unset" ? "" : (v as Fields["workMode"]))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Not set" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unset">Not set</SelectItem>
              {WORK_MODES.map((m) => (
                <SelectItem key={m} value={m}>
                  {WORK_MODE_LABELS[m]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="salary">Salary</Label>
        <Input
          id="salary"
          placeholder="e.g. $120k–150k/yr"
          value={values.salary}
          onChange={(e) => set("salary", e.target.value)}
        />
      </div>

      {actions}
    </form>
  );
}
