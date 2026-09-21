import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import * as cheerio from "cheerio";
import { greenhouseParser } from "@/server/scraping/parsers/greenhouse";

function loadFixture(name: string) {
  const html = readFileSync(path.join(__dirname, "../../fixtures/html", name), "utf-8");
  return { html, $: cheerio.load(html) };
}

const url = "https://job-boards.greenhouse.io/acmeinc/jobs/1234567";

describe("greenhouseParser", () => {
  it("canHandle only greenhouse.io pages that ship a remix hydration payload", () => {
    const { html, $ } = loadFixture("greenhouse-remix.html");
    expect(greenhouseParser.canHandle({ url, html, $ })).toBe(true);

    const other = loadFixture("generic-og-only.html");
    expect(
      greenhouseParser.canHandle({ url: "https://example.com", html: other.html, $: other.$ }),
    ).toBe(false);
  });

  it("reads title/company/location/salary/skills from window.__remixContext", () => {
    const { html, $ } = loadFixture("greenhouse-remix.html");
    const ctx = { url, html, $ };

    const fields = greenhouseParser.extract(ctx);

    expect(fields).toMatchObject({
      positionName: "Senior Backend Engineer",
      // The "(Website)" referral-channel suffix on `company_name` is stripped.
      companyName: "Acme Inc",
      location: "Austin, TX",
      workMode: "hybrid",
      salaryMin: 140000,
      salaryMax: 180000,
      salaryCurrency: "USD",
      salaryPeriod: "year",
    });
    expect(fields?.skills).toEqual(expect.arrayContaining(["Go", "PostgreSQL", "Kubernetes"]));
  });
});
