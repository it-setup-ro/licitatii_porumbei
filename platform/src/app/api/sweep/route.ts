import { sweepAuctions } from "@/lib/auction-service";
import { releaseDuePayouts } from "@/lib/payments";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { jsonOk, jsonTooManyRequests, handleApiError } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * Idempotent: porneste licitatiile programate, inchide expiratele, elibereaza
 * payout-uri scadente. Ruleaza automat la 15s din instrumentation.ts; ramane
 * accesibil public pentru ca UI-ul il apeleaza cand expira un cronometru, dar
 * e limitat ca rata ca sa nu poata fi folosit pentru a incarca baza de date.
 */
export async function POST(req: Request) {
  try {
    const check = rateLimit(`sweep:${clientIp(req)}`, 20, 60_000);
    if (!check.allowed) return jsonTooManyRequests(check.retryAfterSeconds);

    const result = await sweepAuctions();
    await releaseDuePayouts();
    return jsonOk(result);
  } catch (e) {
    return handleApiError(e);
  }
}
