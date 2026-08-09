import { requireUser } from "@/lib/auth";
import { payOrder } from "@/lib/payments";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const result = await payOrder(id, user.id);
    if (!result.ok) return jsonError(result.error, 400);
    return jsonOk({ ref: result.ref });
  } catch (e) {
    return handleApiError(e);
  }
}
