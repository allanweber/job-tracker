import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import * as cheerio from "cheerio";
import { linkedInParser } from "@/server/scraping/parsers/linkedin";

function loadFixture(name: string) {
  const html = readFileSync(path.join(__dirname, "../../fixtures/html", name), "utf-8");
  return { html, $: cheerio.load(html) };
}

describe("linkedInParser", () => {
  it("only handles linkedin.com URLs", () => {
    const { html, $ } = loadFixture("linkedin-job.html");
    expect(linkedInParser.canHandle({ url: "https://www.linkedin.com/jobs/view/123", html, $ })).toBe(
      true,
    );
    expect(linkedInParser.canHandle({ url: "https://example.com/jobs/123", html, $ })).toBe(false);
  });

  it("best-effort extracts position/company/location/work mode", () => {
    const { html, $ } = loadFixture("linkedin-job.html");
    const ctx = { url: "https://www.linkedin.com/jobs/view/123", html, $ };

    const fields = linkedInParser.extract(ctx);

    expect(fields).toMatchObject({
      positionName: "Staff Software Engineer",
      companyName: "Initech",
      location: "San Francisco, CA (Hybrid)",
      workMode: "hybrid",
    });
  });
});
