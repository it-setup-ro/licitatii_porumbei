import { createHmac, timingSafeEqual } from "crypto";
import { normalizeLocale } from "./locales";

/**
 * Linkul de dezabonare din avizul „se încheie o licitație".
 *
 * Omul trebuie să se poată dezabona dintr-un clic, fără parolă. Linkul poartă
 * o semnătură făcută cu secretul serverului: fără ea, oricine ar putea opri
 * avizele oricui, doar ghicind un id.
 */

function secret(): string {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) throw new Error("AUTH_SECRET lipseste");
  return value;
}

export function endingUnsubscribeToken(userId: string): string {
  return createHmac("sha256", secret()).update(`ending-notices:${userId}`).digest("hex").slice(0, 40);
}

export function verifyEndingUnsubscribe(userId: string, token: string): boolean {
  const expected = Buffer.from(endingUnsubscribeToken(userId));
  const given = Buffer.from(token);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export function endingUnsubscribeUrl(userId: string, locale: string): string {
  const base = (process.env.PUBLIC_BASE_URL ?? "").replace(/\/$/, "");
  const loc = normalizeLocale(locale);
  return `${base}/${loc}/ending-notices/unsubscribe?u=${encodeURIComponent(userId)}&t=${endingUnsubscribeToken(userId)}`;
}
