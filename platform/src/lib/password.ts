import { createHash, randomBytes } from "crypto";
import { z } from "zod";

/**
 * Regulile de parolă și tokenul de resetare, într-un singur loc.
 *
 * Erau scrise doar în ruta de înregistrare; acum aceleași reguli se aplică
 * și la resetare, și la schimbarea parolei din cont — altfel cineva își putea
 * pune „12345678" prin resetare, deși la înregistrare ar fi fost refuzat.
 */

/** Lista scurtă de parole banale — blochează cele mai frecvente încercări. */
const COMMON_PASSWORDS = new Set([
  "parola123",
  "password",
  "password1",
  "12345678",
  "123456789",
  "1234567890",
  "qwertyui",
  "qwerty123",
  "iloveyou",
  "admin123",
  "welcome1",
  "parolamea",
]);

export const passwordSchema = z
  .string()
  .min(10, "Parola trebuie să aibă minim 10 caractere")
  .max(200)
  .refine((p) => !COMMON_PASSWORDS.has(p.toLowerCase()), "Parolă prea uzuală")
  .refine((p) => !/^(.)\1+$/.test(p), "Parolă prea simplă");

/** Cât timp e valabil un link de resetare. Scurt: linkul ajunge pe e-mail. */
export const RESET_TOKEN_MINUTES = 60;

/**
 * Generează tokenul de resetare.
 *
 * În bază se ține DOAR amprenta (sha256), niciodată tokenul în clar: dacă
 * cineva ajunge la baza de date, nu poate reface linkurile ca să intre în
 * conturi. Tokenul brut există doar în linkul trimis utilizatorului.
 */
export function newResetToken() {
  const raw = randomBytes(32).toString("hex");
  return { raw, hash: hashToken(raw) };
}

export function hashToken(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}

export function resetExpiry() {
  return new Date(Date.now() + RESET_TOKEN_MINUTES * 60_000);
}

/** Adresa completă a paginii de resetare, pentru linkul din e-mail. */
export function resetLink(rawToken: string, locale = "ro") {
  const base = (process.env.PUBLIC_BASE_URL ?? "http://207.180.241.165:3000").replace(/\/+$/, "");
  return `${base}/${locale}/reset-password?token=${rawToken}`;
}
