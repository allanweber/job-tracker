"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { jobs } from "@/server/db/schema";
import { requireUser } from "@/server/auth/session";
import { syncJobTags } from "@/server/db/queries/tags";
import { nextTopBoardOrder } from "@/server/db/queries/jobs";
import { parseCsv } from "@/lib/csv";
import { parseJobsMatrix, type ImportError } from "@/server/import-export/job-csv";
import { xlsxToMatrix, XlsxParseError } from "@/server/import-export/xlsx";
import type { Stage } from "@/lib/constants";

// Comfortably above any realistic export of job applications, and bounds
// the worst-case parsing/DB work a single request can trigger — matches
// the `bodySizeLimit` bump in next.config.ts (which caps the request that
// carries this file before it even reaches here).
const MAX_FILE_BYTES = 5 * 1024 * 1024;

// Zip local-file-header signature (PK\x03\x04) — every .xlsx is a zip
// archive, so this is how a real .xlsx is told apart from a .csv, rather
// than trusting the filename extension or the browser-supplied MIME type:
// spreadsheet apps sometimes save a "CSV" export that's actually still
// their native binary format under a renamed extension.
const XLSX_MAGIC = [0x50, 0x4b, 0x03, 0x04];
// OLE2/CFB signature — the legacy binary .xls (Excel 97-2003) format.
// exceljs only reads .xlsx, so this file type gets its own clear error
// instead of failing the zip check and being misread as CSV garbage.
const XLS_MAGIC = [0xd0, 0xcf, 0x11, 0xe0];

function hasMagic(bytes: Uint8Array, magic: number[]): boolean {
  if (bytes.length < magic.length) return false;
  return magic.every((b, i) => bytes[i] === b);
}

export type ImportJobsResult =
  | { ok: false; error: string }
  | { ok: true; imported: number; errors: ImportError[] };

export async function importJobsFile(formData: FormData): Promise<ImportJobsResult> {
  const user = await requireUser();

  // `formData` is untrusted input like any other Server Action argument —
  // validate its shape before touching it.
  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "No file was uploaded." };
  if (file.size === 0) return { ok: false, error: "That file is empty." };
  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, error: "That file is too large (max 5MB)." };
  }

  const buffer = await file.arrayBuffer();
  const head = new Uint8Array(buffer, 0, Math.min(4, buffer.byteLength));

  let matrix: string[][];
  if (hasMagic(head, XLSX_MAGIC)) {
    try {
      matrix = await xlsxToMatrix(buffer);
    } catch (err) {
      const message = err instanceof XlsxParseError ? err.message : "Couldn't read that Excel file.";
      return { ok: false, error: message };
    }
  } else if (hasMagic(head, XLS_MAGIC)) {
    return {
      ok: false,
      error: "That's an old .xls (Excel 97-2003) file — please save it as .xlsx or .csv and try again.",
    };
  } else {
    const text = new TextDecoder("utf-8").decode(buffer);
    try {
      matrix = parseCsv(text);
    } catch {
      return { ok: false, error: "Couldn't read that file as CSV." };
    }
  }

  // From here on, CSV and xlsx uploads go through identical mapping/
  // validation logic — same header aliases, same fold-unmapped-columns-
  // into-notes behavior, same `jobFormSchema` checks.
  const parsed = parseJobsMatrix(matrix);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  if (parsed.rows.length === 0) {
    return { ok: true, imported: 0, errors: parsed.errors };
  }

  // Newly imported jobs land at the top of their column, in file order —
  // same convention as a job added by hand (see `nextTopBoardOrder`).
  const nextOrder: Partial<Record<Stage, number>> = {};

  await db.transaction(async (tx) => {
    for (const row of parsed.rows) {
      const stage = row.values.stage;
      const boardOrder =
        nextOrder[stage] === undefined
          ? await nextTopBoardOrder(user.id, stage)
          : nextOrder[stage]! - 1;
      nextOrder[stage] = boardOrder;

      const [inserted] = await tx
        .insert(jobs)
        .values({
          userId: user.id,
          sourceUrl: row.values.sourceUrl,
          positionName: row.values.positionName,
          companyName: row.values.companyName,
          location: row.values.location ?? null,
          workMode: row.values.workMode ?? null,
          salaryMin: row.values.salaryMin ?? null,
          salaryMax: row.values.salaryMax ?? null,
          salaryCurrency: row.values.salaryCurrency ?? null,
          salaryPeriod: row.values.salaryPeriod ?? null,
          salaryRawText: row.values.salaryRawText ?? null,
          skills: row.values.skills,
          notes: row.values.notes ?? null,
          followUpDate: row.values.followUpDate ?? null,
          contactPerson: row.values.contactPerson ?? null,
          stage,
          boardOrder,
          // Preserve the original timeline for a migrated job (from a
          // "Created At"/"Added Date" column) instead of showing it as
          // created just now.
          ...(row.createdAt ? { createdAt: row.createdAt, updatedAt: row.createdAt } : {}),
        })
        .returning({ id: jobs.id });

      await syncJobTags(tx, user.id, inserted.id, row.values.tags);
    }
  });

  revalidatePath("/board");
  return { ok: true, imported: parsed.rows.length, errors: parsed.errors };
}
