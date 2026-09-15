import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { xlsxToMatrix, XlsxParseError } from "@/server/import-export/xlsx";
import { parseJobsMatrix } from "@/server/import-export/job-csv";

async function buildWorkbookBuffer(
  rows: (string | number | Date)[][],
): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Sheet1");
  rows.forEach((row) => sheet.addRow(row));
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as ArrayBuffer;
}

describe("xlsxToMatrix", () => {
  it("reads a plain worksheet into a string matrix", async () => {
    const buffer = await buildWorkbookBuffer([
      ["Job Title", "Company", "Job URL"],
      ["Senior Backend Engineer", "Tilt", "https://jobs.example.com/tilt/123"],
    ]);
    const matrix = await xlsxToMatrix(buffer);
    expect(matrix).toEqual([
      ["Job Title", "Company", "Job URL"],
      ["Senior Backend Engineer", "Tilt", "https://jobs.example.com/tilt/123"],
    ]);
  });

  it("feeds straight into the same job mapping the CSV path uses", async () => {
    const buffer = await buildWorkbookBuffer([
      ["Job Title", "Company", "Status", "Job URL", "Min Salary"],
      ["Senior Backend Engineer", "Tilt", "Applied", "https://jobs.example.com/tilt/123", 120000],
    ]);
    const matrix = await xlsxToMatrix(buffer);
    const result = parseJobsMatrix(matrix);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].values.positionName).toBe("Senior Backend Engineer");
    expect(result.rows[0].values.stage).toBe("applied");
    expect(result.rows[0].values.salaryMin).toBe(120000);
  });

  it("converts a pure date cell to a plain yyyy-mm-dd string, not a full instant", async () => {
    const buffer = await buildWorkbookBuffer([
      ["Job Title", "Company", "Job URL", "Added Date"],
      ["Role", "Co", "https://example.com/x", new Date(Date.UTC(2026, 8, 3))],
    ]);
    const matrix = await xlsxToMatrix(buffer);
    const dateCol = matrix[0].indexOf("Added Date");
    expect(matrix[1][dateCol]).toBe("2026-09-03");

    const result = parseJobsMatrix(matrix);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Timezone-independent: the calendar date must survive regardless of
    // the host's local timezone (see the same guarantee tested for CSV
    // "Added Date" columns in job-csv.test.ts).
    expect(result.rows[0].createdAt?.toISOString().slice(0, 10)).toBe("2026-09-03");
  });

  it("reads only the cached result of a formula cell, never the formula text", async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Sheet1");
    sheet.addRow(["Job Title", "Company", "Job URL"]);
    const row = sheet.addRow(["Role", "Co", null]);
    row.getCell(3).value = {
      formula: 'HYPERLINK("javascript:alert(1)","click")',
      result: "https://example.com/safe",
    };
    const buffer = (await workbook.xlsx.writeBuffer()) as ArrayBuffer;

    const matrix = await xlsxToMatrix(buffer);
    const urlCol = matrix[0].indexOf("Job URL");
    expect(matrix[1][urlCol]).toBe("https://example.com/safe");
    expect(matrix[1][urlCol]).not.toContain("javascript:");
  });

  it("rejects a file that isn't a valid xlsx workbook", async () => {
    const garbage = new TextEncoder().encode("not a real xlsx").buffer;
    await expect(xlsxToMatrix(garbage)).rejects.toBeInstanceOf(XlsxParseError);
  });
});
