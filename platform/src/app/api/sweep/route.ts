import { sweepAuctions } from "@/lib/auction-service";
import { releaseDuePayouts } from "@/lib/payments";
import { jsonOk, handleApiError } from "@/lib/api";

export const dynamic = "force-dynamic";

/** Idempotent: porneste licitatiile programate, inchide expiratele, elibereaza payout-uri scadente.
 *  Apelat de interval-ul din instrumentation si de teste; in productie si de un cron extern. */
export async function POST() {
  try {
    const result = await sweepAuctions();
    await releaseDuePayouts();
    return jsonOk(result);
  } catch (e) {
    return handleApiError(e);
  }
}
