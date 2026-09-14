import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import * as cheerio from "cheerio";
import { openGraphFallbackParser } from "@/server/scraping/parsers/opengraph-fallback";

function loadFixture(name: string) {
  const html = readFileSync(path.join(__dirname, "../../fixtures/html", name), "utf-8");
  return { html, $: cheerio.load(html) };
}

describe("openGraphFallbackParser", () => {
  it("always canHandle (last resort)", () => {
    const { html, $ } = loadFixture("generic-og-only.html");
    expect(openGraphFallbackParser.canHandle({ url: "https://example.com", html, $ })).toBe(true);
  });

  it("splits og:title into position/company and prefers og:site_name", () => {
    const { html, $ } = loadFixture("generic-og-only.html");
    const ctx = { url: "https://example.com/careers/1", html, $ };

    const fields = openGraphFallbackParser.extract(ctx);

    expect(fields).toMatchObject({
      positionName: "Customer Success Manager",
      companyName: "Globex Careers",
    });
  });
});
