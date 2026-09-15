import { formatMoney } from "./money";

/**
 * Lei și euro — partea de calcul, fără bază de date, ca să poată fi folosită
 * și în formularele din browser.
 *
 * Cursul e mereu „lei pentru un euro", ca la BNR (ex. 5,2567).
 */

export type Currency = "RON" | "EUR";

/** Cursul euro și ziua lui, din fișierul BNR (curs.bnr.ro/nbrfxrates.xml). */
export function parseBnrEur(xml: string): { rate: number; date: string } | null {
  const date = xml.match(/<Cube\s+date="(\d{4}-\d{2}-\d{2})"/)?.[1];
  const m = xml.match(/<Rate\s+currency="EUR"(?:\s+multiplier="(\d+)")?\s*>\s*([\d.]+)\s*<\/Rate>/);
  if (!date || !m) return null;
  const rate = Number(m[2]) / (m[1] ? Number(m[1]) : 1);
  if (!Number.isFinite(rate) || rate <= 0) return null;
  return { rate, date };
}

export function otherCurrency(currency: string): Currency | null {
  return currency === "RON" ? "EUR" : currency === "EUR" ? "RON" : null;
}

/** Suma în cealaltă monedă, în bani / cenți. */
export function convertCents(cents: number, from: string, ronPerEur: number): number {
  if (!(ronPerEur > 0)) return 0;
  return from === "RON" ? Math.round(cents / ronPerEur) : Math.round(cents * ronPerEur);
}

/**
 * „≈ 285 €" lângă „1.500 lei" (sau invers). Rotunjit la unități întregi: e un
 * reper, nu suma de plată — cumpărătorul plătește în moneda licitației.
 */
export function equivalentLabel(
  cents: number,
  currency: string,
  locale: string,
  ronPerEur: number
): string | null {
  const other = otherCurrency(currency);
  if (!other || !(ronPerEur > 0)) return null;
  const whole = Math.round(convertCents(cents, currency, ronPerEur) / 100) * 100;
  return `≈ ${formatMoney(whole, other, locale)}`;
}

export function formatRate(rate: number, locale: string): string {
  return new Intl.NumberFormat(locale === "en" ? "en-GB" : "ro-RO", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(rate);
}
