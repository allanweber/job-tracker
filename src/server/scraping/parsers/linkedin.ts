import type { JobParser, ParseContext, ExtractedJobFields } from "../types";
import { detectWorkMode } from "../work-mode";
import { extractSkillsFromText } from "../skills";

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

    // Newer LinkedIn layouts show workplace type ("Remote"/"Hybrid"/"On-site")
    // as its own element, and all the "flavor" bullets (not just the first,
    // which we've already taken as the location) can carry it too.
    const workplaceTypeText = $(
      ".job-details-jobs-unified-top-card__workplace-type, .jobs-unified-top-card__workplace-type",
    )
      .first()
      .text()
      .trim();
    const allBulletsText = $(
      ".topcard__flavor--bullet, .job-details-jobs-unified-top-card__bullet",
    )
      .map((_, el) => $(el).text().trim())
      .get()
      .join(" ");

    const detectedWorkMode = detectWorkMode(workplaceTypeText, allBulletsText, title);
    if (detectedWorkMode) fields.workMode = detectedWorkMode;

    const descriptionText = $(
      ".description__text, .jobs-description__content, .jobs-box__html-content",
    )
      .first()
      .text();
    const skills = extractSkillsFromText(descriptionText);
    if (skills.length > 0) fields.skills = skills;

    return Object.keys(fields).length > 0 ? fields : null;
  },
};
