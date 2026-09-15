import { createHash } from "crypto";
import { CappedMap, create, randomInt } from "altcha-lib/frameworks/nextjs";
import { deriveKey } from "altcha-lib/algorithms/pbkdf2";

/**
 * „Nu sunt robot" la înregistrare, fără cont la vreun serviciu extern.
 *
 * Clientul: „cea mai simplă verificare, dacă se poate fără cont". ALTCHA rulează
 * pe serverul nostru: browserul rezolvă o mică problemă de calcul (o jumătate de
 * secundă pentru un om, scump pentru un robot care face mii de conturi), iar
 * serverul verifică semnătura. Nimic nu pleacă la Google sau Cloudflare, deci
 * nici acord de cookie-uri pentru captcha.
 *
 * Cheile se derivă din AUTH_SECRET — nu e nimic nou de configurat pe server.
 */

function secret(label: string): string {
  const base = process.env.ALTCHA_HMAC_KEY || process.env.AUTH_SECRET;
  if (!base) throw new Error("AUTH_SECRET lipsește");
  return createHash("sha256").update(`${label}:${base}`).digest("hex");
}

type Altcha = ReturnType<typeof create>;
const g = globalThis as unknown as { __altcha?: Altcha; __altchaUsed?: CappedMap };

function used(): CappedMap {
  // un răspuns rezolvat se poate folosi o singură dată
  if (!g.__altchaUsed) g.__altchaUsed = new CappedMap({ maxSize: 20_000 });
  return g.__altchaUsed;
}

function altcha(): Altcha {
  if (!g.__altcha) {
    g.__altcha = create({
      deriveKey,
      hmacSignatureSecret: secret("altcha-signature"),
      hmacKeySignatureSecret: secret("altcha-key"),
      store: used(),
      createChallengeParameters: () => ({
        algorithm: "PBKDF2/SHA-256",
        cost: 5_000,
        counter: randomInt(5_000, 10_000),
        // o provocare neterminată în 20 de minute trebuie cerută din nou
        expiresAt: new Date(Date.now() + 20 * 60_000),
      }),
    });
  }
  return g.__altcha;
}

export function captchaChallenge(req: Request): Promise<Response> {
  return altcha().challengeHandler(req);
}

/** Suita e2e îl oprește (CAPTCHA_DISABLED=1): browserele de test n-au de ce să rezolve provocări. */
export function captchaDisabled(): boolean {
  return process.env.CAPTCHA_DISABLED === "1";
}

export async function verifyCaptcha(payload: unknown): Promise<boolean> {
  if (captchaDisabled()) return true;
  if (typeof payload !== "string" || payload.length === 0 || payload.length > 10_000) return false;
  const result = await altcha().verify(
    payload,
    deriveKey,
    secret("altcha-signature"),
    secret("altcha-key"),
    used()
  );
  return !result.error;
}
