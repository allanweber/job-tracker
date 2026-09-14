export interface StructuredSalary {
  min?: number;
  max?: number;
  currency?: string;
  period?: "year" | "hour";
}

// Ordered longest-symbol-first: "R$" must be checked before "$", or a BRL
// price would always be misread as USD ("R$ 8.000".includes("$") is true).
const CURRENCY_SYMBOLS: [symbol: string, code: string][] = [
  ["R$", "BRL"],
  ["$", "USD"],
  ["£", "GBP"],
  ["€", "EUR"],
  ["¥", "JPY"],
];

const CURRENCY_CODES = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY", "CHF", "NZD", "INR", "BRL"];

/**
 * Interprets a single separator-bearing number, since "." and "," swap roles
 * between locales: "$120,000" (US: comma = thousands) vs "R$ 120.000,00"
 * (BR/EU: period = thousands, comma = decimal). When both separators are
 * present, whichever appears LAST is the decimal point and the other is a
 * thousands grouping. When only one kind appears, a trailing 1-2 digit group
 * reads as decimal cents ("8,50", "8.5"); a trailing 3-digit group reads as
 * a thousands grouping ("8,000", "8.000").
 */
function parseLocaleNumber(raw: string): number {
  const hasComma = raw.includes(",");
  const hasDot = raw.includes(".");

  if (hasComma && hasDot) {
    const decimalSep = raw.lastIndexOf(",") > raw.lastIndexOf(".") ? "," : ".";
    const thousandsSep = decimalSep === "," ? "." : ",";
    return parseFloat(raw.split(thousandsSep).join("").replace(decimalSep, "."));
  }

  const sep = hasComma ? "," : hasDot ? "." : undefined;
  if (!sep) return parseFloat(raw);

  const afterSep = raw.slice(raw.lastIndexOf(sep) + 1);
  const isDecimal = afterSep.length > 0 && afterSep.length <= 2;
  return isDecimal ? parseFloat(raw.replace(sep, ".")) : parseFloat(raw.split(sep).join(""));
}

function normalizeNumber(raw: string): number {
  const cleaned = raw.trim();
  // "120k" / "120K" -> 120000
  const kMatch = cleaned.match(/^([\d,.]+)\s*[kK]$/);
  if (kMatch) {
    return Math.round(parseLocaleNumber(kMatch[1]) * 1000);
  }
  return Math.round(parseLocaleNumber(cleaned));
}

function detectPeriod(text: string): "year" | "hour" | undefined {
  // "hora"/"ano" are pt-BR ("R$ 50 por hora", "R$ 120.000 ao ano").
  if (/\b(hr|hour|hourly|horas?)\b/i.test(text)) return "hour";
  if (/\b(yr|year|annum|annual(ly)?|anos?|anual)\b/i.test(text)) return "year";
  return undefined;
}

function detectCurrency(text: string): string | undefined {
  for (const code of CURRENCY_CODES) {
    if (new RegExp(`\\b${code}\\b`, "i").test(text)) return code.toUpperCase();
  }
  for (const [symbol, code] of CURRENCY_SYMBOLS) {
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
