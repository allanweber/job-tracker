"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsPanel } from "@/components/ui/tabs";
import { TagInput } from "@/components/jobs/tag-input";
import { FileField } from "@/components/jobs/file-field";
import {
  STAGES,
  STAGE_LABELS,
  STAGE_COLORS,
  WORK_MODES,
  WORK_MODE_LABELS,
  SALARY_PERIODS,
  type Stage,
} from "@/lib/constants";
import { saveJob } from "@/server/actions/jobs";
import { jobFormSchema, type JobFormValues } from "@/lib/validation/job.schema";
import type { documents } from "@/server/db/schema";

type FormState = Omit<JobFormValues, "skills" | "tags"> & {
  skills: string[];
  tags: string[];
};

export function JobReviewForm({
  initialValues,
  documents: docs,
  scrapeBanner,
  stageHistory,
  onClose,
}: {
  initialValues: Partial<FormState> & { sourceUrl: string };
  documents: (typeof documents.$inferSelect)[];
  scrapeBanner?: { tone: "warning" | "info"; message: string } | null;
  /** Chronological (oldest first) log of stage transitions — only meaningful
   * once a job exists, so omitted for the new-job form. */
  stageHistory?: { stage: Stage; changedAt: Date }[];
  /**
   * Called both to cancel and after a successful save. How to navigate away
   * differs by context (a plain `router.push` won't close the add/edit
   * modal — see the modal wrapper components), so the caller decides.
   */
  onClose?: () => void;
}) {
  const [values, setValues] = useState<FormState>({
    id: initialValues.id,
    // Only meaningful for an edit (a new job always lands in "applied" —
    // enforced server-side in `saveJob` regardless of what's sent here);
    // defaults to "applied" so the schema still has a valid value when
    // the Status select isn't shown.
    stage: initialValues.stage ?? "applied",
    sourceUrl: initialValues.sourceUrl,
    positionName: initialValues.positionName ?? "",
    companyName: initialValues.companyName ?? "",
    location: initialValues.location ?? "",
    workMode: initialValues.workMode ?? null,
    salaryMin: initialValues.salaryMin ?? null,
    salaryMax: initialValues.salaryMax ?? null,
    salaryCurrency: initialValues.salaryCurrency ?? "",
    salaryPeriod: initialValues.salaryPeriod ?? null,
    salaryRawText: initialValues.salaryRawText ?? "",
    skills: initialValues.skills ?? [],
    tags: initialValues.tags ?? [],
    notes: initialValues.notes ?? "",
    followUpDate: initialValues.followUpDate ?? "",
    contactPerson: initialValues.contactPerson ?? "",
    resumeDocumentId: initialValues.resumeDocumentId ?? null,
    coverLetterDocumentId: initialValues.coverLetterDocumentId ?? null,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // For a new job, `stage` is always "applied" here (no Status select is
    // rendered, and `saveJob` re-enforces "applied" server-side regardless
    // of what's sent). For an edit, this is the real value from the Status
    // select below.
    const parsed = jobFormSchema.safeParse(values);
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
        toast.success(parsed.data.id ? "Job updated" : "Job saved");
        onClose?.();
      } catch (err) {
        if (err instanceof Error && err.message === "Job not found") {
          toast.error("That job couldn't be found.");
          return;
        }
        toast.error("Couldn't save that job — please try again.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-2xl flex-col gap-5">
      {scrapeBanner && (
        <div
          className={`rounded-md border p-3 text-sm ${
            scrapeBanner.tone === "warning"
              ? "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
              : "border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200"
          }`}
        >
          {scrapeBanner.message}
        </div>
      )}

      {/* Tabs are purely a display grouping — `values` is lifted state, so
          switching tabs (which unmounts the inactive panel's inputs) never
          loses data, and `handleSubmit` reads from `values` regardless of
          which tab is active. Every field that can carry a validation error
          (sourceUrl, positionName, companyName) lives in "Job info", so
          errors are never stranded on a hidden tab.

          Each panel gets the same fixed height + its own scrollbar so
          switching tabs can never resize the modal — "Job info" (the
          tallest) scrolls internally rather than growing the dialog, and
          the shorter tabs just leave the extra space blank instead of the
          dialog shrinking to hug them. */}
      <Tabs defaultValue="info" className="flex flex-col gap-4">
        <TabsList>
          <TabsTrigger value="info">Job info</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="extras">Extras</TabsTrigger>
        </TabsList>

        <TabsPanel value="info" className="h-[50vh] overflow-y-auto pr-1">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sourceUrl">Job URL</Label>
            <Input
              id="sourceUrl"
              type="url"
              value={values.sourceUrl}
              onChange={(e) => set("sourceUrl", e.target.value)}
            />
            {errors.sourceUrl && <p className="text-sm text-destructive">{errors.sourceUrl}</p>}
          </div>

          {/* Only shown when editing an existing job — a new job always
              starts in "applied" (see `handleSubmit`'s comment above and
              `saveJob`, which re-enforces that server-side regardless of
              this form). Otherwise the only way to change stage is
              dragging a card on the board. */}
          {values.id && (
            <div className="flex flex-col gap-1.5">
              <Label>Status</Label>
              <Select value={values.stage} onValueChange={(v) => set("stage", v as FormState["stage"])}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAGES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STAGE_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {values.id && stageHistory && stageHistory.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <Label>History</Label>
              <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
                {stageHistory.map((entry, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: STAGE_COLORS[entry.stage] }}
                    />
                    <span className="text-foreground">{STAGE_LABELS[entry.stage]}</span>
                    <span>
                      {entry.changedAt.toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="positionName">Position</Label>
              <Input
                id="positionName"
                value={values.positionName}
                onChange={(e) => set("positionName", e.target.value)}
              />
              {errors.positionName && (
                <p className="text-sm text-destructive">{errors.positionName}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="companyName">Company</Label>
              <Input
                id="companyName"
                value={values.companyName}
                onChange={(e) => set("companyName", e.target.value)}
              />
              {errors.companyName && <p className="text-sm text-destructive">{errors.companyName}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={values.location ?? ""}
                onChange={(e) => set("location", e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Work mode</Label>
              <Select
                value={values.workMode ?? "unset"}
                onValueChange={(v) => set("workMode", v === "unset" ? null : (v as FormState["workMode"]))}
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

          <fieldset className="flex flex-col gap-2 rounded-md border p-3">
            <legend className="px-1 text-sm font-medium">Salary</legend>
            <div className="grid grid-cols-4 gap-2">
              <Input
                type="number"
                placeholder="Min"
                value={values.salaryMin ?? ""}
                onChange={(e) => set("salaryMin", e.target.value === "" ? null : Number(e.target.value))}
              />
              <Input
                type="number"
                placeholder="Max"
                value={values.salaryMax ?? ""}
                onChange={(e) => set("salaryMax", e.target.value === "" ? null : Number(e.target.value))}
              />
              <Input
                placeholder="Currency"
                maxLength={3}
                value={values.salaryCurrency ?? ""}
                onChange={(e) => set("salaryCurrency", e.target.value.toUpperCase())}
              />
              <Select
                value={values.salaryPeriod ?? "unset"}
                onValueChange={(v) =>
                  set("salaryPeriod", v === "unset" ? null : (v as FormState["salaryPeriod"]))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unset">Not set</SelectItem>
                  {SALARY_PERIODS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p === "year" ? "/ year" : "/ hour"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input
              placeholder="Original text (fallback if the above isn't accurate)"
              value={values.salaryRawText ?? ""}
              onChange={(e) => set("salaryRawText", e.target.value)}
            />
          </fieldset>

          <div className="flex flex-col gap-1.5">
            <Label>Main skills</Label>
            <TagInput value={values.skills} onChange={(v) => set("skills", v)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Tags</Label>
            <TagInput value={values.tags} onChange={(v) => set("tags", v)} />
          </div>
        </TabsPanel>

        <TabsPanel value="files" className="h-[50vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-4">
            <FileField
              label="Resume"
              kind="resume"
              documents={docs}
              value={values.resumeDocumentId ?? null}
              onChange={(v) => set("resumeDocumentId", v)}
            />
            <FileField
              label="Cover letter"
              kind="cover_letter"
              documents={docs}
              value={values.coverLetterDocumentId ?? null}
              onChange={(v) => set("coverLetterDocumentId", v)}
            />
          </div>
        </TabsPanel>

        <TabsPanel value="extras" className="h-[50vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contactPerson">Contact person</Label>
              <Input
                id="contactPerson"
                value={values.contactPerson ?? ""}
                onChange={(e) => set("contactPerson", e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="followUpDate">Follow-up date</Label>
              <Input
                id="followUpDate"
                type="date"
                value={values.followUpDate ?? ""}
                onChange={(e) => set("followUpDate", e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              rows={4}
              value={values.notes ?? ""}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>
        </TabsPanel>
      </Tabs>

      <div className="flex gap-2">
        <Button type="submit" variant="cta" disabled={pending}>
          {pending ? "Saving…" : "Save job"}
        </Button>
        {onClose && (
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
