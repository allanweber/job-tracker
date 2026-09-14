/**
 * Best-effort remote/hybrid/onsite detection from free text (titles, location
 * strings, job descriptions). schema.org's `jobLocationType` can only ever say
 * "TELECOMMUTE" or nothing — it has no way to express hybrid, and most sites
 * don't set it correctly (or at all) even for fully remote roles — so text
 * scanning is the primary signal, not a last resort.
 *
 * Includes pt-BR terms (Brazilian job boards — Gupy, Catho, LinkedIn BR,
 * company career pages — routinely list work mode in Portuguese, and never
 * in the English wording alone).
 */

// Checked in this order: "hybrid" is the most specific and unambiguous
// keyword, so a listing that mentions both "hybrid" and "remote" (e.g.
// "Hybrid — remote-friendly, 2 days onsite") is a hybrid role, not remote.
// [ií]/[óo] alternations tolerate missing accents (copy/paste from sites that
// strip diacritics is common: "hibrido", "presencial" either way).
// "s?" throughout the pt-BR alternatives: "vagas 100% remotas", "empresas
// híbridas" pluralize the adjective, which the singular-only forms missed.
const HYBRID_RE = /\bhybrid\b|\bh[íi]brid[oa]s?\b/i;
// A plain "\bremote\b" already covers "fully remote", "100% remote",
// "remote-first", "remote-friendly", etc. — the word boundary doesn't care
// what's on the other side of the hyphen/space. Same for "\bremot[oa]s?\b".
const REMOTE_RE =
  /\bremote\b|\bwork[-\s]?from[-\s]?home\b|\bwfh\b|\btelecommut(?:e|ing)\b|\btelework(?:ing)?\b|\banywhere\s+in\s+the\s+(?:us|u\.s\.|world)\b|\bremot[oa]s?\b|\bhome[-\s]?office\b/i;
// "presencial" pluralizes irregularly ("presenciais", not "presencials").
const ONSITE_RE =
  /\bon[-\s]?site\b|\bin[-\s]?office\b|\bin[-\s]?person\b|\bno\s+remote\b|\bpresencia(?:l|is)\b|\bin\s+loco\b/i;

export type WorkMode = "remote" | "hybrid" | "onsite";

/** Scans any number of text fragments (skipping empty/undefined ones) and
 * returns the first work mode it can infer, or undefined if none of the
 * fragments say anything either way. */
export function detectWorkMode(...fragments: (string | null | undefined)[]): WorkMode | undefined {
  const text = fragments.filter(Boolean).join(" \n ");
  if (!text.trim()) return undefined;

  if (HYBRID_RE.test(text)) return "hybrid";
  if (REMOTE_RE.test(text)) return "remote";
  if (ONSITE_RE.test(text)) return "onsite";
  return undefined;
}
