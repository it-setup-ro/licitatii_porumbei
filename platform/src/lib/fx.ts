import { getSettings, setSetting } from "./settings";
import { parseBnrEur } from "./fx-math";

/**
 * Cursul euro al platformei.
 *
 * Clientul: prețul în lei și, lângă el, echivalentul în euro, „cu schimbul zilei
 * de la BNR, cu posibilitate de schimbare a cursului". Cursul BNR se ia singur;
 * adminul poate scrie unul manual, care rămâne până apasă „Revino la BNR".
 */

/** BNR a mutat fișierul: vechiul www.bnr.ro/nbrfxrates.xml duce acum la prima pagină. */
export const BNR_URL = "https://curs.bnr.ro/nbrfxrates.xml";

/** Lei pentru un euro, sau null dacă echivalentul e oprit sau nu există încă un curs. */
export async function getEurRate(): Promise<number | null> {
  const s = await getSettings();
  if (!s.currencyEquivalentEnabled) return null;
  if (s.fxMode === "MANUAL" && s.fxManualRate > 0) return s.fxManualRate;
  return s.fxBnrRate > 0 ? s.fxBnrRate : null;
}

const g = globalThis as unknown as { __bnrAttemptAt?: number };
/** BNR publică o dată pe zi, după ora 13; o încercare pe oră e destul. */
const RETRY_MS = 60 * 60_000;

export async function refreshBnrRate(
  force = false
): Promise<{ ok: true; rate: number; date: string } | { ok: false; error: string }> {
  if (!force && Date.now() - (g.__bnrAttemptAt ?? 0) < RETRY_MS) {
    return { ok: false, error: "THROTTLED" };
  }
  g.__bnrAttemptAt = Date.now();
  if (process.env.FX_FETCH_DISABLED === "1") return { ok: false, error: "DISABLED" };

  try {
    const res = await fetch(BNR_URL, { signal: AbortSignal.timeout(15_000), cache: "no-store" });
    if (!res.ok) return { ok: false, error: `HTTP_${res.status}` };
    const parsed = parseBnrEur(await res.text());
    if (!parsed) return { ok: false, error: "PARSE" };

    const s = await getSettings();
    if (s.fxBnrRate !== parsed.rate) await setSetting("fxBnrRate", parsed.rate, null);
    if (s.fxBnrDate !== parsed.date) await setSetting("fxBnrDate", parsed.date, null);
    return { ok: true, ...parsed };
  } catch {
    return { ok: false, error: "NETWORK" };
  }
}
