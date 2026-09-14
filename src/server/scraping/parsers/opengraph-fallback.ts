import type { JobParser, ParseContext, ExtractedJobFields } from "../types";

/** Last-resort parser: applies to any site, using generic meta tags. */
export const openGraphFallbackParser: JobParser = {
  name: "opengraph-fallback",

  canHandle() {
    return true;
  },

  extract(ctx: ParseContext) {
    const { $ } = ctx;
    const fields: ExtractedJobFields = {};

    const ogTitle = $('meta[property="og:title"]').attr("content")?.trim();
    const title = ogTitle || $("title").first().text().trim();
    const siteName = $('meta[property="og:site_name"]').attr("content")?.trim();

    if (title) {
      // Common patterns: "Position - Company", "Position at Company", "Position | Company"
      const separators = [" - ", " – ", " at ", " | "];
      let split: [string, string] | null = null;
      for (const sep of separators) {
        if (title.includes(sep)) {
          const [a, b] = title.split(sep);
          split = [a.trim(), b.trim()];
          break;
        }
      }
      if (split) {
        fields.positionName = split[0];
        fields.companyName = siteName || split[1];
      } else {
        fields.positionName = title;
        if (siteName) fields.companyName = siteName;
      }
    } else if (siteName) {
      fields.companyName = siteName;
    }

    return Object.keys(fields).length > 0 ? fields : null;
  },
};
