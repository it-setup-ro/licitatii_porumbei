import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import {
  OrderError,
  cancelUnpaidOrder,
  markOrderDelivered,
  markOrderPaid,
  undoOrderStep,
} from "@/lib/orders";
import { jsonOk, jsonError, handleApiError, jsonValidationError } from "@/lib/api";

/** Plătit / Predat / retragerea ultimului marcaj / anularea unui câștigător care nu plătește. */

const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("PAID"),
    method: z.enum(["TRANSFER", "CASH"], { message: "Alege cum s-a plătit: transfer sau numerar." }),
    paidAt: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Data plății nu e scrisă corect.")
      .optional(),
  }),
  z.object({ action: z.literal("DELIVERED"), carrier: z.string().trim().max(120).optional() }),
  z.object({ action: z.literal("UNDO") }),
  z.object({ action: z.literal("CANCEL"), reason: z.string().trim().max(300).optional() }),
]);

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;
    const body = schema.safeParse(await req.json());
    if (!body.success) return jsonValidationError(body.error);
    const d = body.data;

    if (d.action === "PAID") {
      // ziua aleasă, la prânz ora locală — ca să nu sară pe ziua de dinainte din cauza fusului orar
      const paidAt = d.paidAt ? new Date(`${d.paidAt}T12:00:00`) : new Date();
      await markOrderPaid(id, admin.id, d.method, paidAt);
    } else if (d.action === "DELIVERED") {
      await markOrderDelivered(id, admin.id, d.carrier || null);
    } else if (d.action === "UNDO") {
      await undoOrderStep(id, admin.id);
    } else {
      await cancelUnpaidOrder(id, admin.id, d.reason || null);
    }
    return jsonOk();
  } catch (e) {
    if (e instanceof OrderError) return jsonError(e.code, e.status);
    return handleApiError(e);
  }
}
