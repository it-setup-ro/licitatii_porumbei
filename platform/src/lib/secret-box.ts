import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

/**
 * Cutia pentru secrete mici păstrate în baza de date (deocamdată: parola de
 * e-mail scrisă din administrare).
 *
 * De ce criptat: parola stă lângă restul datelor, iar copiile de siguranță
 * zilnice ajung în alt loc. Cheia nu e în baza de date — se face din
 * `AUTH_SECRET`, care stă doar în fișierul de configurare de pe server. O copie
 * a bazei, singură, nu descuie nimic.
 */

function cheia(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("AUTH_SECRET lipsește sau e prea scurt: nu pot păstra secrete în siguranță.");
  }
  return createHash("sha256").update(`smtp:${secret}`).digest();
}

/** „parola” -> „v1:iv:tag:continut”, toate în base64url. */
export function sealSecret(text: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", cheia(), iv);
  const continut = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), continut.toString("base64url")].join(":");
}

/** Întoarce textul, sau null dacă nu se poate descuia (cheie schimbată, date stricate). */
export function openSecret(sealed: string): string | null {
  try {
    const [versiune, iv, tag, continut] = sealed.split(":");
    if (versiune !== "v1" || !iv || !tag || !continut) return null;
    const decipher = createDecipheriv("aes-256-gcm", cheia(), Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(continut, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
