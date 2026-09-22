import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";

/**
 * Șterge definitiv un porumbel și licitația lui.
 *
 * Merge doar cât nu s-a întâmplat nimic cu el: fără oferte și fără comandă.
 * Dacă a licitat cineva, ștergerea ar lăsa oamenii fără urma banilor pe care
 * i-au pus — acolo se folosește retragerea (care îi și anunță), sau ascunderea.
 */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;

    const auction = await prisma.auction.findUnique({
      where: { id },
      include: {
        order: { select: { id: true } },
        _count: { select: { bids: true } },
        pigeon: { select: { id: true, name: true, ringNumber: true } },
      },
    });
    if (!auction) return jsonError("NOT_FOUND", 404);
    if (auction._count.bids > 0 || auction.order) {
      return jsonError("HAS_HISTORY", 409, {
        bids: auction._count.bids,
        hasOrder: auction.order !== null,
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.watchItem.deleteMany({ where: { auctionId: id } });
      // notificările care trimiteau la pagina lui n-ar mai duce nicăieri
      await tx.notification.deleteMany({ where: { link: { contains: id } } });
      await tx.auction.delete({ where: { id } });
      // pozele, clipurile și palmaresul pleacă odată cu porumbelul (cascade)
      await tx.pigeon.delete({ where: { id: auction.pigeon.id } });
      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          action: "AUCTION_DELETED",
          entity: "Auction",
          entityId: id,
          dataJson: JSON.stringify({
            pigeon: auction.pigeon.name,
            ring: auction.pigeon.ringNumber,
            saleMode: auction.saleMode,
            status: auction.status,
          }),
        },
      });
    });

    return jsonOk({ deleted: true });
  } catch (e) {
    return handleApiError(e);
  }
}
