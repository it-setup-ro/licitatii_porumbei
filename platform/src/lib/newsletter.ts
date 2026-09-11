import { randomBytes } from "crypto";

/**
 * Textul bifat la abonare, pastrat odata cu adresa.
 *
 * Se tine aici, nu in fisierul de traduceri: traducerile se schimba, iar noi
 * trebuie sa putem arata exact ce scria in ziua in care omul a bifat.
 */
export const CONSENT_TEXT: Record<string, string> = {
  ro: "Sunt de acord să primesc pe e-mail noutăți despre licitații și porumbei. Mă pot dezabona oricând, dintr-un link aflat în fiecare mesaj.",
  en: "I agree to receive email updates about auctions and pigeons. I can unsubscribe at any time using the link in every message.",
};

export function consentTextFor(locale: string): string {
  return CONSENT_TEXT[locale] ?? CONSENT_TEXT.ro;
}

/** Token de dezabonare: aleator, destul de lung cat sa nu fie ghicit. */
export function newUnsubToken(): string {
  return randomBytes(24).toString("hex");
}
