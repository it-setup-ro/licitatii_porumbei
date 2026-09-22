import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";

/**
 * Șterge definitiv o licitație de crescător, cu loturile și porumbeii ei.
 *
 * Merge doar dacă nu a vândut nimic: nicio comandă și nicio ofertă. O licitație
 * care a vândut se arhivează, nu se șterge — altfel dispar comenzile
 * cumpărătorilor și decontul crescătorului.
 */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;

    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        breeder: { select: { name: true } },
        lots: {
          include: {
            auctions: {
              include: { order: { select: { id: true } }, _count: { select: { bids: true } } },
            },
          },
        },
      },
    });
    if (!sale) return jsonError("NOT_FOUND", 404);

    const auctions = sale.lots.flatMap((l) => l.auctions);
    const cuOferte = auctions.filter((a) => a._count.bids > 0).length;
    const cuComenzi = auctions.filter((a) => a.order).length;
    if (cuOferte > 0 || cuComenzi > 0) {
      return jsonError("HAS_HISTORY", 409, { bids: cuOferte, orders: cuComenzi });
    }

    const pigeonIds = auctions.map((a) => a.pigeonId);
    const auctionIds = auctions.map((a) => a.id);

    await prisma.$transaction(async (tx) => {
      if (auctionIds.length > 0) {
        await tx.watchItem.deleteMany({ where: { auctionId: { in: auctionIds } } });
        await tx.auction.deleteMany({ where: { id: { in: auctionIds } } });
      }
      if (pigeonIds.length > 0) {
        // pozele și palmaresul pleacă odată cu porumbeii (cascade)
        await tx.pigeon.deleteMany({ where: { id: { in: pigeonIds } } });
      }
      await tx.lot.deleteMany({ where: { saleId: id } });
      await tx.sale.delete({ where: { id } });
      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          action: "SALE_DELETED",
          entity: "Sale",
          entityId: id,
          dataJson: JSON.stringify({
            title: sale.titleRo,
            breeder: sale.breeder.name,
            lots: sale.lots.length,
            pigeons: pigeonIds.length,
          }),
        },
      });
    });

    return jsonOk({ deleted: true, lots: sale.lots.length, pigeons: pigeonIds.length });
  } catch (e) {
    return handleApiError(e);
  }
}
