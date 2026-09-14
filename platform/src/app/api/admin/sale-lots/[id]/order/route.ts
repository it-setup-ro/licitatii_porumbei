import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { renumberLot } from "@/lib/lot-service";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";

/**
 * Ordinea porumbeilor în lot (1.01, 1.02…). Doar cât lotul e în ciornă.
 */

const schema = z.object({ auctionIds: z.array(z.string().max(40)).min(1).max(100) });

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;
    const body = schema.safeParse(await req.json());
    if (!body.success) return jsonError("VALIDATION", 422);

    const lot = await prisma.lot.findUnique({
      where: { id },
      include: { auctions: { select: { id: true } } },
    });
    if (!lot) return jsonError("NOT_FOUND", 404);
    if (lot.status !== "DRAFT") return jsonError("LOT_NOT_DRAFT", 409);

    // lista trebuie să fie exact porumbeii lotului — nici în plus, nici în minus
    const actuali = new Set(lot.auctions.map((a) => a.id));
    const trimisi = body.data.auctionIds;
    if (trimisi.length !== actuali.size || new Set(trimisi).size !== trimisi.length || !trimisi.every((a) => actuali.has(a))) {
      return jsonError("ORDER_MISMATCH", 422);
    }

    await prisma.$transaction(async (tx) => {
      await renumberLot(tx, trimisi);
      await tx.auditLog.create({
        data: { actorId: admin.id, action: "LOT_REORDERED", entity: "Lot", entityId: id },
      });
    });
    return jsonOk();
  } catch (e) {
    return handleApiError(e);
  }
}
