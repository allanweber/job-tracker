/**
 * Minimal RFC 4180 CSV parser/serializer. Framework-agnostic (used by both
 * the export Route Handler and the import Server Action) and deliberately
 * hand-rolled rather than a naive `split(",")`/`split("\n")`, which breaks on
 * quoted fields containing commas, newlines, or escaped quotes — all of
 * which real spreadsheet exports (Excel, Sheets, this app's own export) use.
 */

/** Parses CSV text into a matrix of raw string cells. Tolerates CRLF, LF,
 * a leading UTF-8 BOM, and a trailing newline. Does not trim/validate — that
 * happens downstream once callers know what each column means. */
export function parseCsv(text: string): string[][] {
  // Strip a leading UTF-8 BOM, which Excel/Sheets prepend and which would
  // otherwise end up glued onto the first header cell.
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  const len = text.length;

  function endField() {
    row.push(field);
    field = "";
  }
  function endRow() {
    endField();
    rows.push(row);
    row = [];
  }

  while (i < len) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ",") {
      endField();
      i++;
      continue;
    }
    if (ch === "\r") {
      // Treat a lone \r or a \r\n pair as one row terminator.
      if (text[i + 1] === "\n") i++;
      endRow();
      i++;
      continue;
    }
    if (ch === "\n") {
      endRow();
      i++;
      continue;
    }
    field += ch;
    i++;
  }

  // Flush a trailing field/row unless the file ended cleanly on a newline
  // (in which case there's nothing left to flush but an empty phantom row).
  if (field.length > 0 || row.length > 0 || inQuotes) {
    endRow();
  }

  return rows;
}

// A cell whose text starts with one of these characters can be interpreted
// as a formula by Excel/Sheets/LibreOffice when the CSV is reopened there —
// a well-known "CSV/formula injection" vector (e.g. a company name of
// `=HYPERLINK("http://evil","click")` or `@SUM(...)`). Since this app's
// export exists specifically to be reopened in a spreadsheet, every field
// gets defused by prefixing a leading single quote, which spreadsheet apps
// treat as a text marker and never render.
const FORMULA_INJECTION_RE = /^[=+\-@\t\r]/;

/** Escapes a single value for CSV output: quotes it if needed and defuses
 * leading formula-trigger characters. */
export function csvField(value: string): string {
  let v = value;
  if (FORMULA_INJECTION_RE.test(v)) v = "'" + v;
  if (/[",\n\r]/.test(v)) v = `"${v.replace(/"/g, '""')}"`;
  return v;
}

/** Serializes rows of plain strings into RFC 4180 CSV text (CRLF line
 * endings, per spec), including a UTF-8 BOM so Excel opens non-ASCII text
 * (accents, non-Latin scripts) correctly instead of guessing the wrong
 * encoding. */
export function buildCsv(rows: string[][]): string {
  const body = rows.map((r) => r.map(csvField).join(",")).join("\r\n");
  return "\uFEFF" + body + "\r\n";
}
