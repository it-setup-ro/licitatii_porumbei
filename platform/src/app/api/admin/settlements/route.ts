import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { OrderError, settleGroup } from "@/lib/orders";
import { jsonOk, jsonError, handleApiError, jsonValidationError } from "@/lib/api";

/** „Marchează decontat": porumbeii plătiți și nedecontați ai unui grup intră într-un decont. */

const schema = z
  .object({
    saleId: z.string().min(1).optional(),
    offeredBy: z.string().max(160).optional(),
  })
  .refine((d) => Boolean(d.saleId) !== (d.offeredBy !== undefined), {
    message: "Alege licitația crescătorului sau „Oferit de”.",
  });

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    const body = schema.safeParse(await req.json());
    if (!body.success) return jsonValidationError(body.error);
    const group = body.data.saleId ? { saleId: body.data.saleId } : { offeredBy: body.data.offeredBy ?? "" };
    const s = await settleGroup(group, admin.id);
    return jsonOk({ id: s.id, payoutCents: s.payoutCents });
  } catch (e) {
    if (e instanceof OrderError) return jsonError(e.code, e.status);
    return handleApiError(e);
  }
}
