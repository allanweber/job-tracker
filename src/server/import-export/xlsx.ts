import ExcelJS from "exceljs";
import { pad2 } from "@/server/import-export/job-csv";

// Deliberately no `import "server-only"` here, for the same reason as
// `job-csv.ts`: pure data transform (bytes in, strings out), so it stays
// importable from a unit test without a bundler's `react-server` condition.

/** Same cap as the CSV path (`MAX_ROWS` in `job-csv.ts`) — checked again
 * here, independently, while reading rows one at a time so a pathological
 * sheet (e.g. a spreadsheet app writing millions of "used" rows/columns
 * beyond the visible data) can't force us to buffer far more than we'll
 * ever use before `parseJobsMatrix` gets a chance to reject it. */
const MAX_ROWS = 2000;
/** Bounds how many columns of a row we'll read. Legitimate exports here
 * have at most ~20 columns; this just stops a corrupt/adversarial sheet
 * with a huge "dimension" from ballooning memory per row. */
const MAX_COLS = 100;

/** Recursively unwraps exceljs's cell-value shapes (rich text runs,
 * hyperlinks, formulas) down to plain display text. A formula cell's
 * `formula` string is never returned or evaluated — only its cached
 * `result` is — so a spreadsheet's stored formulas can't do anything here
 * beyond contribute inert text, the same as any other cell. */
function cellToText(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (value instanceof Date) {
    // Pure date-only cells come back as UTC midnight; keep them as a plain
    // yyyy-mm-dd calendar string so downstream parsing (`parseCalendarDate`
    // in job-csv.ts) takes its timezone-independent ISO fast path instead
    // of reinterpreting a `Date` through local time.
    const isMidnightUtc =
      value.getUTCHours() === 0 &&
      value.getUTCMinutes() === 0 &&
      value.getUTCSeconds() === 0 &&
      value.getUTCMilliseconds() === 0;
    return isMidnightUtc
      ? `${value.getUTCFullYear()}-${pad2(value.getUTCMonth() + 1)}-${pad2(value.getUTCDate())}`
      : value.toISOString();
  }
  if (typeof value === "object") {
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((run) => run.text).join("");
    }
    if ("text" in value) {
      // Hyperlink cells: { text, hyperlink }. `text` can itself be a
      // rich-text array.
      return typeof value.text === "string" ? value.text : cellToText(value.text as ExcelJS.CellValue);
    }
    if ("result" in value) {
      // Formula cell: only the cached result is ever used.
      return value.result != null ? cellToText(value.result as ExcelJS.CellValue) : "";
    }
    if ("error" in value) return "";
    if ("sharedFormula" in value) return "";
    return "";
  }
  return String(value);
}

export class XlsxParseError extends Error {}

/** Reads the first worksheet of an .xlsx workbook into the same
 * `string[][]` shape `parseCsv` produces, so both formats feed the same
 * `parseJobsMatrix`. Only ever reads cell *values* (never macros, external
 * links, or anything executable) and bounds rows/columns read regardless of
 * what the file claims its used range is. */
export async function xlsxToMatrix(buffer: ArrayBuffer | Buffer): Promise<string[][]> {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer as ArrayBuffer);
  } catch {
    throw new XlsxParseError("Couldn't read that as an Excel (.xlsx) file.");
  }

  const sheet = workbook.worksheets[0];
  if (!sheet) throw new XlsxParseError("That workbook doesn't have any sheets.");

  const matrix: string[][] = [];
  // Stop a little past the header + MAX_ROWS data rows: `parseJobsMatrix`
  // rejects anything over that cap anyway, so there's no need to read
  // (or hold in memory) more of an oversized sheet than that.
  const rowLimit = Math.min(sheet.rowCount, MAX_ROWS + 2);
  for (let r = 1; r <= rowLimit; r++) {
    const row = sheet.getRow(r);
    const cells: string[] = [];
    const colCount = Math.min(row.cellCount, MAX_COLS);
    for (let c = 1; c <= colCount; c++) {
      cells.push(cellToText(row.getCell(c).value));
    }
    matrix.push(cells);
  }
  return matrix;
}
