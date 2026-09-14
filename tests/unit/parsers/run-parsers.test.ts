import { describe, expect, it } from "vitest";
import * as cheerio from "cheerio";
import { runParsers } from "@/server/scraping/parsers";

describe("runParsers", () => {
  it("keeps running the fallback parser to supplement fields the JSON-LD parser didn't find", () => {
    // JSON-LD here only supplies positionName/companyName — no location,
    // workMode, or skills — which used to make runParsers stop immediately
    // (isSufficient() was already true) before the fallback parser, the only
    // one that could fill those in from the page body, ever ran.
    const html = `
      <html>
        <head>
          <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@type": "JobPosting",
            "title": "Data Analyst",
            "hiringOrganization": { "@type": "Organization", "name": "Initrode" }
          }
          </script>
        </head>
        <body>
          <div class="job-location">Denver, CO</div>
          <p>This is a hybrid role. Skills: SQL, Tableau, Python.</p>
        </body>
      </html>
    `;
    const ctx = { url: "https://example.com/careers/9", html, $: cheerio.load(html) };

    const fields = runParsers(ctx);

    expect(fields.positionName).toBe("Data Analyst");
    expect(fields.companyName).toBe("Initrode");
    expect(fields.location).toBe("Denver, CO");
    expect(fields.workMode).toBe("hybrid");
    expect(fields.skills).toEqual(expect.arrayContaining(["SQL", "Tableau", "Python"]));
  });

  it("defaults location to \"Remote\" when workMode is remote but no location was found", () => {
    const html = `
      <html>
        <head>
          <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@type": "JobPosting",
            "title": "Support Engineer",
            "hiringOrganization": { "@type": "Organization", "name": "Umbrella Inc" },
            "jobLocationType": "TELECOMMUTE"
          }
          </script>
        </head>
        <body></body>
      </html>
    `;
    const ctx = { url: "https://example.com/careers/10", html, $: cheerio.load(html) };

    const fields = runParsers(ctx);

    expect(fields.workMode).toBe("remote");
    expect(fields.location).toBe("Remote");
  });
});
