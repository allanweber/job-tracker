import { describe, expect, it } from "vitest";
import { parseJobsCsv, jobsToCsv } from "@/server/import-export/job-csv";
import { parseCsv, buildCsv } from "@/lib/csv";
import type { JobWithTags } from "@/server/db/queries/jobs";

function job(overrides: Partial<JobWithTags> = {}): JobWithTags {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    userId: "user-1",
    sourceUrl: "https://example.com/job",
    positionName: "Software Engineer",
    companyName: "Acme",
    location: "Remote",
    workMode: "remote",
    salaryMin: 100000,
    salaryMax: 150000,
    salaryCurrency: "USD",
    salaryPeriod: "year",
    salaryRawText: "$100k-150k",
    skills: ["TypeScript", "React"],
    notes: "Great team",
    followUpDate: "2026-10-01",
    contactPerson: "Jane Doe",
    stage: "applied",
    boardOrder: 0,
    resumeDocumentId: null,
    coverLetterDocumentId: null,
    createdAt: new Date("2026-09-01T00:00:00.000Z"),
    updatedAt: new Date("2026-09-01T00:00:00.000Z"),
    tags: ["dream-job"],
    stageCount: 1,
    reachedStages: ["applied"],
    stagePath: ["applied"],
    ...overrides,
  };
}

describe("jobsToCsv / parseJobsCsv round trip", () => {
  it("round-trips a job through our own export format", () => {
    const csv = jobsToCsv([job()]);
    const result = parseJobsCsv(csv);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(1);
    const values = result.rows[0].values;
    expect(values).toMatchObject({
      positionName: "Software Engineer",
      companyName: "Acme",
      location: "Remote",
      workMode: "remote",
      stage: "applied",
      salaryMin: 100000,
      salaryMax: 150000,
      salaryCurrency: "USD",
      salaryPeriod: "year",
      skills: ["TypeScript", "React"],
      tags: ["dream-job"],
      followUpDate: "2026-10-01",
      contactPerson: "Jane Doe",
      sourceUrl: "https://example.com/job",
    });
    expect(values.notes).toBe("Great team");
    expect(result.rows[0].createdAt?.toISOString()).toBe("2026-09-01T00:00:00.000Z");
  });
});

describe("parseJobsCsv — legacy header recognition", () => {
  it("maps a legacy tracker's export headers (Job Title, Status, Job URL, ...)", () => {
    const rows = [
      [
        "Job Title",
        "Company",
        "Location",
        "Status",
        "Employment Type",
        "Min Salary",
        "Max Salary",
        "Deadline",
        "Excitement (0-5)",
        "Job URL",
        "Description",
        "Notes",
        "Added Date",
      ],
      [
        "Senior Backend Engineer",
        "Tilt",
        "",
        "Applied",
        "Full-time",
        "",
        "",
        "",
        "3",
        "https://jobs.example.com/tilt/123",
        "Build cool things",
        "Referred by a friend",
        "Sep 3, 2026",
      ],
    ];
    const csv = buildCsv(rows);

    const result = parseJobsCsv(csv);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.errors).toEqual([]);
    const { values, createdAt } = result.rows[0];
    expect(values.positionName).toBe("Senior Backend Engineer");
    expect(values.companyName).toBe("Tilt");
    expect(values.stage).toBe("applied");
    expect(values.sourceUrl).toBe("https://jobs.example.com/tilt/123");
    // Columns with no equivalent field (Employment Type, Excitement,
    // Description) are folded into notes rather than dropped.
    expect(values.notes).toContain("Employment Type: Full-time");
    expect(values.notes).toContain("Excitement (0-5): 3");
    expect(values.notes).toContain("Description: Build cool things");
    expect(values.notes).toContain("Referred by a friend");
    expect(createdAt?.toISOString().slice(0, 10)).toBe("2026-09-03");
  });

  it("falls back an unrecognized status to 'applied' and records the original text in notes", () => {
    const csv = "Job Title,Company,Job URL,Status\nRole,Co,https://example.com/x,Wishlist";
    const result = parseJobsCsv(csv);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows[0].values.stage).toBe("applied");
    expect(result.rows[0].values.notes).toContain("Imported status: Wishlist");
  });
});

describe("parseJobsCsv — validation and error reporting", () => {
  it("rejects the file outright when no recognizable columns exist", () => {
    const result = parseJobsCsv("Foo,Bar\n1,2");
    expect(result.ok).toBe(false);
  });

  it("rejects an empty file", () => {
    const result = parseJobsCsv("");
    expect(result.ok).toBe(false);
  });

  it("skips a row missing a required field and reports which row", () => {
    const csv = [
      "Position,Company,Source URL",
      "Engineer,Acme,https://example.com/a",
      "No URL Here,Acme,",
    ].join("\n");
    const result = parseJobsCsv(csv);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows).toHaveLength(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].row).toBe(3);
  });

  it("rejects a javascript: URL in the Source URL column", () => {
    const csv = "Position,Company,Source URL\nEngineer,Acme,javascript:alert(1)";
    const result = parseJobsCsv(csv);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
  });

  it("neutralizes a formula-injection payload in a text field without executing/interpreting it", () => {
    const csv = [
      "Position,Company,Source URL,Notes",
      'Engineer,Acme,https://example.com/a,"=HYPERLINK(""http://evil.test"")"',
    ].join("\n");
    const result = parseJobsCsv(csv);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows).toHaveLength(1);
    // Stored verbatim as text (React/Postgres don't execute it); the CSV
    // *export* path (csvField) is what defuses it for spreadsheet apps.
    expect(result.rows[0].values.notes).toContain("HYPERLINK");
  });

  it("parses money-formatted salary values and rejects garbage ones into notes", () => {
    const csv = [
      "Position,Company,Source URL,Salary Min,Salary Max",
      "Engineer,Acme,https://example.com/a,\"$120,000\",not-a-number",
    ].join("\n");
    const result = parseJobsCsv(csv);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows[0].values.salaryMin).toBe(120000);
    expect(result.rows[0].values.salaryMax).toBeNull();
    expect(result.rows[0].values.notes).toContain("Salary max: not-a-number");
  });

  it("splits skills/tags on semicolons and dedupes", () => {
    const csv = [
      "Position,Company,Source URL,Skills,Tags",
      "Engineer,Acme,https://example.com/a,TypeScript; React; TypeScript,dream; dream",
    ].join("\n");
    const result = parseJobsCsv(csv);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows[0].values.skills).toEqual(["TypeScript", "React"]);
    expect(result.rows[0].values.tags).toEqual(["dream"]);
  });

  it("enforces a row cap rather than silently truncating", () => {
    const header = "Position,Company,Source URL";
    const row = "Engineer,Acme,https://example.com/a";
    const csv = [header, ...Array(2001).fill(row)].join("\n");
    const result = parseJobsCsv(csv);
    expect(result.ok).toBe(false);
  });
});

describe("jobsToCsv — defuses formula-injection payloads for spreadsheet re-import", () => {
  it("prefixes a leading '=' in a stored field on export", () => {
    const csv = jobsToCsv([job({ companyName: '=HYPERLINK("http://evil.test","click")' })]);
    const matrix = parseCsv(csv);
    const companyCol = matrix[0].indexOf("Company");
    expect(matrix[1][companyCol].startsWith("'=")).toBe(true);
  });
});
