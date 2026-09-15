import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { getSettings, setSetting } from "@/lib/settings";
import { refreshBnrRate } from "@/lib/fx";
import { jsonOk, jsonError, handleApiError, jsonValidationError } from "@/lib/api";

/**
 * Cursul lei / euro: manual, înapoi la BNR, sau luat acum de la BNR.
 * Fiecare schimbare trece prin setări, deci rămâne în jurnalul de audit.
 */

const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("MANUAL"),
    rate: z
      .number({ message: "Scrie cursul." })
      .gt(1, "Cursul trebuie să fie mai mare decât 1.")
      .lt(100, "Curs prea mare."),
  }),
  z.object({ action: z.literal("BNR") }),
  z.object({ action: z.literal("REFRESH") }),
]);

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    const body = schema.safeParse(await req.json());
    if (!body.success) return jsonValidationError(body.error);
    const d = body.data;

    if (d.action === "MANUAL") {
      await setSetting("fxManualRate", d.rate, admin.id);
      await setSetting("fxMode", "MANUAL", admin.id);
    } else if (d.action === "BNR") {
      await setSetting("fxMode", "BNR", admin.id);
      if (!((await getSettings()).fxBnrRate > 0)) {
        const r = await refreshBnrRate(true);
        if (!r.ok) return jsonError("BNR_UNAVAILABLE", 502);
      }
    } else {
      const r = await refreshBnrRate(true);
      if (!r.ok) return jsonError("BNR_UNAVAILABLE", 502);
    }

    const s = await getSettings();
    return jsonOk({
      mode: s.fxMode,
      manualRate: s.fxManualRate,
      bnrRate: s.fxBnrRate,
      bnrDate: s.fxBnrDate,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
