/**
 * Decodes a handful of common HTML entities. Not a full HTML entity table —
 * just enough to recover JSON that some sites (seen on Gupy) incorrectly
 * HTML-escape before embedding in a `<script type="application/ld+json">`
 * (e.g. `&quot;@type&quot;:...`), which is invalid JSON as written. `&amp;`
 * is decoded last so a double-escaped `&amp;quot;` doesn't get treated as a
 * literal quote.
 */
export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&amp;/g, "&");
}
