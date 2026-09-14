import { z } from "zod";

/**
 * Numele public din istoricul ofertelor.
 *
 * Numele real nu apare niciodată acolo: cine licitează pe o platformă publică
 * nu trebuie să-și dea în vileag identitatea față de concurenți. Înainte se
 * afișau inițiale mascate („M. P***"), care nu spuneau nimic nimănui; un
 * nickname ales de om face istoricul lizibil și competiția vie, fără să
 * divulge cine e.
 */

/**
 * Porecla e liberă, cum a cerut clientul: „poreclă / nume / cod". Litere, și cu
 * diacritice, cifre, spații, punct, cratimă, underscore; 2–30 de caractere.
 * Începe și se termină cu literă sau cifră, ca să nu existe „Ionut" și
 * „Ionut_" care arată la fel în istoric.
 */
export const NICKNAME_RE = /^[\p{L}\p{N}][\p{L}\p{N} ._-]{0,28}[\p{L}\p{N}]$/u;

export const nicknameSchema = z
  .string()
  .trim()
  .min(2, "Minim 2 caractere")
  .max(30, "Maxim 30 de caractere")
  .regex(NICKNAME_RE, "Litere, cifre, spații, punct, - și _; începe și se termină cu literă sau cifră")
  .refine((s) => !/\s{2,}/.test(s), "Un singur spațiu între cuvinte");

const DIACRITICE: Record<string, string> = {
  ă: "a", â: "a", î: "i", ș: "s", ş: "s", ț: "t", ţ: "t",
  Ă: "A", Â: "A", Î: "I", Ș: "S", Ş: "S", Ț: "T", Ţ: "T",
};

/**
 * Propune un nickname pornind de la numele real: „Ion Câmpeanu" → „IonC".
 * Doar o sugestie de pornire în formular — omul îl poate schimba.
 */
export function suggestNickname(name: string): string {
  const parts = name
    .replace(/[ăâîșşțţĂÂÎȘŞȚŢ]/g, (c) => DIACRITICE[c] ?? c)
    .replace(/[^A-Za-z0-9 ]/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const base = (parts[0] ?? "") + (parts[1]?.[0] ?? "");
  const clean = base.slice(0, 20);
  return clean.length >= 3 ? clean : "Ofertant";
}
