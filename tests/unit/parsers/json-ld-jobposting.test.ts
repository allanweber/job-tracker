import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import * as cheerio from "cheerio";
import { jsonLdJobPostingParser } from "@/server/scraping/parsers/json-ld-jobposting";

function loadFixture(name: string) {
  const html = readFileSync(
    path.join(__dirname, "../../fixtures/html", name),
    "utf-8",
  );
  return { html, $: cheerio.load(html) };
}

describe("jsonLdJobPostingParser", () => {
  it("extracts fields from a Greenhouse-style JobPosting", () => {
    const { html, $ } = loadFixture("greenhouse-jobposting.html");
    const ctx = { url: "https://boards.greenhouse.io/acme/jobs/1", html, $ };

    expect(jsonLdJobPostingParser.canHandle(ctx)).toBe(true);
    const fields = jsonLdJobPostingParser.extract(ctx);

    expect(fields).toMatchObject({
      positionName: "Senior Backend Engineer",
      companyName: "Acme Corp",
      location: "Austin, TX, US",
      workMode: "remote",
      salaryMin: 140000,
      salaryMax: 180000,
      salaryCurrency: "USD",
      salaryPeriod: "year",
      skills: ["Go", "PostgreSQL", "Kubernetes", "gRPC"],
    });
  });

  it("extracts a single-value salary and array skills from a Lever-style JobPosting", () => {
    const { html, $ } = loadFixture("lever-jobposting.html");
    const ctx = { url: "https://jobs.lever.co/northwind/1", html, $ };

    const fields = jsonLdJobPostingParser.extract(ctx);

    expect(fields).toMatchObject({
      positionName: "Product Designer",
      companyName: "Northwind",
      location: "Remote",
      workMode: "remote",
      salaryMin: 95000,
      salaryMax: 95000,
      salaryPeriod: "year",
      skills: ["Figma", "Design Systems", "User Research"],
    });
  });

  it("does not handle pages without JSON-LD", () => {
    const { html, $ } = loadFixture("generic-og-only.html");
    const ctx = { url: "https://example.com/careers/1", html, $ };
    expect(jsonLdJobPostingParser.canHandle(ctx)).toBe(false);
  });

  it("recovers from a Gupy-style HTML-entity-encoded JSON-LD payload and reads the workMode stashed in additionalProperty", () => {
    const { html, $ } = loadFixture("gupy-jobposting.html");
    const ctx = { url: "https://ids.gupy.io/job/abc123", html, $ };

    const fields = jsonLdJobPostingParser.extract(ctx);

    expect(fields).toMatchObject({
      positionName: "Arquiteto de Software Sênior",
      companyName: "IDS Software e Assessoria",
      location: "Brasil",
      workMode: "remote",
    });
  });
});
