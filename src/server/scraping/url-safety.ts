const PRIVATE_HOSTNAME_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^0\./,
  /^10\./,
  /^192\.168\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^\[?::1\]?$/,
  /^\[?fe80:/i,
  /^\[?fc00:/i,
  /^\[?fd00:/i,
];

/**
 * Minimal SSRF guard: only allow http(s) URLs pointing at what looks like a
 * public hostname. Not exhaustive (doesn't resolve DNS to catch rebinding),
 * but blocks the obvious cases of pasting an internal/loopback URL.
 */
export function assertSafeUrl(rawUrl: string): URL {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("Not a valid URL");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http/https URLs are supported");
  }

  const hostname = url.hostname;
  if (PRIVATE_HOSTNAME_PATTERNS.some((p) => p.test(hostname))) {
    throw new Error("URLs pointing at private/internal addresses are not allowed");
  }

  return url;
}
