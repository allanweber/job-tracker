import type { JobParser, ParseContext, ExtractedJobFields } from "../types";

export const linkedInParser: JobParser = {
  name: "linkedin",

  canHandle(ctx: ParseContext) {
    try {
      return new URL(ctx.url).hostname.includes("linkedin.com");
    } catch {
      return false;
    }
  },

  extract(ctx: ParseContext) {
    const { $ } = ctx;
    const fields: ExtractedJobFields = {};

    // og:title on LinkedIn job pages is typically "Position hiring at Company | LinkedIn"
    // or "Company hiring Position in Location | LinkedIn" — best-effort split.
    const ogTitle = $('meta[property="og:title"]').attr("content")?.trim();
    const h1 = $("h1").first().text().trim();
    const title = h1 || ogTitle;

    if (title) {
      const hiringAtMatch = title.match(/^(.*?)\s+hiring\s+(.*?)\s+in\s+(.*)$/i);
      const atMatch = title.match(/^(.*?)\s+at\s+(.*)$/i);
      if (hiringAtMatch) {
        fields.companyName = hiringAtMatch[1].trim();
        fields.positionName = hiringAtMatch[2].trim();
        fields.location = hiringAtMatch[3].trim();
      } else if (atMatch) {
        fields.positionName = atMatch[1].trim();
        fields.companyName = atMatch[2].replace(/\s*\|\s*LinkedIn$/i, "").trim();
      } else {
        fields.positionName = title.replace(/\s*\|\s*LinkedIn$/i, "").trim();
      }
    }

    const orgLink = $(".topcard__org-name-link, .job-details-jobs-unified-top-card__company-name")
      .first()
      .text()
      .trim();
    if (orgLink) fields.companyName = orgLink;

    const locationText = $(
      ".topcard__flavor--bullet, .job-details-jobs-unified-top-card__bullet",
    )
      .first()
      .text()
      .trim();
    if (locationText) fields.location = locationText;

    if (/\bremote\b/i.test(`${locationText} ${title ?? ""}`)) fields.workMode = "remote";
    else if (/\bhybrid\b/i.test(`${locationText} ${title ?? ""}`)) fields.workMode = "hybrid";

    return Object.keys(fields).length > 0 ? fields : null;
  },
};
