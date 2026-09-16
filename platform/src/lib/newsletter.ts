import { randomBytes } from "crypto";
import { messagesFor } from "./messages";

/**
 * Textul bifat la abonare, pastrat odata cu adresa.
 *
 * Se tine aici, nu in fisierul de traduceri: traducerile se schimba, iar noi
 * trebuie sa putem arata exact ce scria in ziua in care omul a bifat.
 */
/** Textul exact pe care l-a bifat omul, în limba în care l-a citit. */
export function consentTextFor(locale: string): string {
  return messagesFor(locale).email.consentText;
}

/** Token de dezabonare: aleator, destul de lung cat sa nu fie ghicit. */
export function newUnsubToken(): string {
  return randomBytes(24).toString("hex");
}
