import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { renumberLot } from "@/lib/lot-service";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";

/**
 * Scoate un porumbel dintr-un lot în ciornă. Cei rămași se renumerotează,
 * ca să nu rămână o gaură între 1.03 și 1.05.
 *
 * Doar în ciornă: un lot programat sau pornit are porumbeii lui ficși.
 */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;

    const auction = await prisma.auction.findUnique({
      where: { id },
      include: { lot: true, _count: { select: { bids: true } } },
    });
    if (!auction || !auction.lot) return jsonError("NOT_FOUND", 404);
    if (auction.lot.status !== "DRAFT") return jsonError("LOT_NOT_DRAFT", 409);
    if (auction._count.bids > 0) return jsonError("HAS_BIDS", 409);

    await prisma.$transaction(async (tx) => {
      await tx.watchItem.deleteMany({ where: { auctionId: id } });
      await tx.auction.delete({ where: { id } });
      await tx.mediaAsset.deleteMany({ where: { pigeonId: auction.pigeonId } });
      await tx.pigeonResult.deleteMany({ where: { pigeonId: auction.pigeonId } });
      await tx.pigeon.delete({ where: { id: auction.pigeonId } });

      const ramasi = await tx.auction.findMany({
        where: { lotId: auction.lotId },
        orderBy: { lotPosition: "asc" },
        select: { id: true },
      });
      await renumberLot(tx, ramasi.map((a) => a.id));

      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          action: "LOT_PIGEON_REMOVED",
          entity: "Lot",
          entityId: auction.lotId!,
          dataJson: JSON.stringify({ auctionId: id }),
        },
      });
    });

    return jsonOk();
  } catch (e) {
    return handleApiError(e);
  }
}
