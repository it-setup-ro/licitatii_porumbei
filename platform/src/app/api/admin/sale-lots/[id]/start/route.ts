import { requireAdmin } from "@/lib/auth";
import { startLot } from "@/lib/lot-service";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";

/**
 * „Start lot": toți porumbeii din lot pornesc deodată — acum, sau singuri la
 * ora de început. Un lot incomplet nu pornește, iar răspunsul spune ce lipsește.
 */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;

    const result = await startLot(id, admin.id);
    if (!result.ok) {
      if ("notFound" in result) return jsonError("NOT_FOUND", 404);
      return jsonError("LOT_NOT_READY", 422, { problems: result.problems });
    }
    return jsonOk({ status: result.status });
  } catch (e) {
    return handleApiError(e);
  }
}
