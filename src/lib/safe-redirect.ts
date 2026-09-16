// Only ever follow a same-origin relative path: guards against `redirectTo`
// being turned into an open redirect (e.g. `//evil.com` or `/\evil.com`,
// both of which browsers can treat as protocol-relative absolute URLs).
export function safeRedirect(redirectTo: string | undefined, fallback = "/board"): string {
  if (!redirectTo) return fallback;
  if (!redirectTo.startsWith("/")) return fallback;
  if (redirectTo.startsWith("//") || redirectTo.startsWith("/\\")) return fallback;
  return redirectTo;
}
