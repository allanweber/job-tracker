export interface StructuredSalary {
  min?: number;
  max?: number;
  currency?: string;
  period?: "year" | "hour";
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  "$": "USD",
  "£": "GBP",
  "€": "EUR",
  "¥": "JPY",
};

const CURRENCY_CODES = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY", "CHF", "NZD", "INR", "BRL"];

function normalizeNumber(raw: string): number {
  let cleaned = raw.trim();
  // "120k" / "120K" -> 120000
  const kMatch = cleaned.match(/^([\d,.]+)\s*[kK]$/);
  if (kMatch) {
    return Math.round(parseFloat(kMatch[1].replace(/,/g, "")) * 1000);
  }
  cleaned = cleaned.replace(/,/g, "");
  return Math.round(parseFloat(cleaned));
}

function detectPeriod(text: string): "year" | "hour" | undefined {
  if (/\b(hr|hour|hourly)\b/i.test(text)) return "hour";
  if (/\b(yr|year|annum|annual(ly)?)\b/i.test(text)) return "year";
  return undefined;
}

function detectCurrency(text: string): string | undefined {
  for (const code of CURRENCY_CODES) {
    if (new RegExp(`\\b${code}\\b`, "i").test(text)) return code.toUpperCase();
  }
  for (const [symbol, code] of Object.entries(CURRENCY_SYMBOLS)) {
    if (text.includes(symbol)) return code;
  }
  return undefined;
}

/**
 * Best-effort extraction of a structured salary from free text like:
 * "$120,000 - $150,000 a year", "£45k–£55k per annum", "$40/hr", "USD 90,000/yr".
 * Pure function, no I/O — the raw text should always be kept alongside this
 * as a fallback since structuring is inherently lossy/imperfect.
 */
export function parseSalary(raw: string | null | undefined): StructuredSalary {
  if (!raw) return {};
  const text = raw.trim();
  if (!text) return {};

  const currency = detectCurrency(text);
  const period = detectPeriod(text);

  // Matches numbers optionally prefixed with a currency symbol and optionally
  // suffixed with "k"/"K", e.g. "$120,000", "150k", "£45k".
  const numberPattern = /[$£€¥]?\s?([\d][\d,.]*\s?[kK]?)/g;
  const matches = [...text.matchAll(numberPattern)]
    .map((m) => m[1])
    .filter(Boolean)
    .map(normalizeNumber)
    .filter((n) => Number.isFinite(n) && n > 0);

  if (matches.length === 0) return { currency, period };

  if (matches.length === 1) {
    return { min: matches[0], max: matches[0], currency, period };
  }

  const min = Math.min(...matches);
  const max = Math.max(...matches);
  return { min, max, currency, period };
}
