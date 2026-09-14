import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import * as cheerio from "cheerio";
import { remotarParser } from "@/server/scraping/parsers/remotar";

function loadFixture(name: string) {
  const html = readFileSync(path.join(__dirname, "../../fixtures/html", name), "utf-8");
  return { html, $: cheerio.load(html) };
}

describe("remotarParser", () => {
  it("only handles remotar.com.br URLs", () => {
    const { html, $ } = loadFixture("remotar-nextdata.html");
    expect(remotarParser.canHandle({ url: "https://remotar.com.br/job/162597", html, $ })).toBe(true);
    expect(remotarParser.canHandle({ url: "https://example.com/job/1", html, $ })).toBe(false);
  });

  it("reads the job record out of the Next.js __NEXT_DATA__ hydration payload", () => {
    const { html, $ } = loadFixture("remotar-nextdata.html");
    const ctx = { url: "https://remotar.com.br/job/162597", html, $ };

    const fields = remotarParser.extract(ctx);

    expect(fields).toMatchObject({
      positionName: "Desenvolvedor(a) Full Stack Java/React Sênior",
      companyName: "Lyncas",
      workMode: "remote",
    });
    expect(fields?.skills).toEqual(expect.arrayContaining(["Java", "Spring Boot", "React"]));
  });
});
