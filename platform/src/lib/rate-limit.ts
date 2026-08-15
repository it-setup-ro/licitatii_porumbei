/**
 * Rate limiting simplu, in memorie (fereastra glisanta pe intervale fixe).
 * Suficient pentru o singura instanta — exact cum ruleaza acum pe VPS.
 * La scalare pe mai multe instante se inlocuieste cu Redis, pastrand semnatura.
 *
 * Scop: fara asta, /api/auth/login accepta incercari nelimitate de parola
 * (atac dictionar), /register permite spam de conturi, iar /upload poate umple
 * discul serverului.
 */

type Bucket = { count: number; resetAt: number };

const g = globalThis as unknown as { __rateLimitStore?: Map<string, Bucket> };
const store = (): Map<string, Bucket> => (g.__rateLimitStore ??= new Map());

/** Curata intrarile expirate ca sa nu creasca memoria la nesfarsit. */
function sweepExpired(now: number) {
  const s = store();
  if (s.size < 5_000) return;
  for (const [key, bucket] of s) if (bucket.resetAt <= now) s.delete(key);
}

export type RateLimitResult = { allowed: boolean; retryAfterSeconds: number };

export function rateLimit(key: string, max: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweepExpired(now);
  const s = store();
  const existing = s.get(key);

  if (!existing || existing.resetAt <= now) {
    s.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }
  if (existing.count >= max) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }
  existing.count++;
  return { allowed: true, retryAfterSeconds: 0 };
}

/** IP-ul clientului, din headerele puse de reverse proxy (nginx) sau direct. */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

/** Sterge contorul dupa o actiune reusita (ex. login corect). */
export function resetLimit(key: string) {
  store().delete(key);
}
