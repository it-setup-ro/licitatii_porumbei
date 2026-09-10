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

/** Litere, cifre, cratimă și underscore. Fără spații, fără diacritice. */
export const NICKNAME_RE = /^[A-Za-z0-9_-]{3,20}$/;

export const nicknameSchema = z
  .string()
  .trim()
  .min(3, "Minim 3 caractere")
  .max(20, "Maxim 20 de caractere")
  .regex(NICKNAME_RE, "Doar litere, cifre, - și _ (fără spații sau diacritice)");

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
