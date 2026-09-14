import "server-only";

/**
 * Tier 2: headless-browser render for JS-heavy pages or plain-fetch-blocked
 * sites. Launches a fresh Chromium instance per call — acceptable for a
 * single self-hosted instance; a warm shared browser can be added later if
 * scrape latency becomes a problem.
 */
export async function renderHtml(url: string, timeoutMs = 15000): Promise<string> {
  const { chromium } = await import("playwright");
  // Playwright's official Docker image runs as root, which Chromium's
  // sandbox refuses by default — --no-sandbox is standard/expected there.
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  try {
    const page = await browser.newPage({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: timeoutMs });
    return await page.content();
  } finally {
    await browser.close();
  }
}
