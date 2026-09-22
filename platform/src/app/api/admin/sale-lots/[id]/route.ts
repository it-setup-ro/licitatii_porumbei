import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { lotIsLocked, statusAtStart } from "@/lib/lots";
import { jsonOk, jsonError, handleApiError, jsonValidationError } from "@/lib/api";

/**
 * Orele unui lot. Se schimbă cât lotul e în ciornă sau programat, până la ora
 * de început — după aceea „o dată începută, rămâne începută".
 */

const schema = z.object({
  startsAt: z.string().datetime({ message: "Alege data și ora de început." }),
  endsAt: z.string().datetime({ message: "Alege data și ora de sfârșit." }),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;
    const body = schema.safeParse(await req.json());
    if (!body.success) return jsonValidationError(body.error);

    const startsAt = new Date(body.data.startsAt);
    const endsAt = new Date(body.data.endsAt);
    const now = new Date();

    const lot = await prisma.lot.findUnique({ where: { id } });
    if (!lot) return jsonError("NOT_FOUND", 404);
    if (lotIsLocked(lot.status, lot.startsAt, now)) return jsonError("LOT_LOCKED", 409);

    if (endsAt <= startsAt) {
      return jsonError("VALIDATION", 422, {
        fields: { endsAt: "Sfârșitul trebuie să fie după început." },
      });
    }
    if (lot.status === "SCHEDULED" && endsAt <= now) {
      return jsonError("VALIDATION", 422, {
        fields: { endsAt: "Lotul e programat: sfârșitul trebuie să fie în viitor." },
      });
    }

    // un lot programat căruia i se mută începutul în trecut pornește acum
    const status = lot.status === "SCHEDULED" ? statusAtStart(startsAt, now) : lot.status;

    await prisma.$transaction([
      prisma.lot.update({ where: { id }, data: { startsAt, endsAt, status } }),
      prisma.auction.updateMany({
        where: { lotId: id },
        data: {
          startsAt,
          endsAt,
          originalEndsAt: endsAt,
          ...(lot.status === "SCHEDULED" ? { status } : {}),
        },
      }),
      prisma.auditLog.create({
        data: {
          actorId: admin.id,
          action: "LOT_TIMES_CHANGED",
          entity: "Lot",
          entityId: id,
          dataJson: JSON.stringify({
            inainte: { startsAt: lot.startsAt, endsAt: lot.endsAt },
            acum: { startsAt, endsAt },
          }),
        },
      }),
    ]);

    return jsonOk({ status });
  } catch (e) {
    return handleApiError(e);
  }
}

/**
 * Șterge un lot rămas ciornă, cu porumbeii lui.
 *
 * Doar ciornele: un lot pornit are oferte în spate și o promisiune făcută
 * oamenilor. Dacă vreun porumbel din el are deja oferte sau comandă, nu se
 * șterge nimic — se ascunde sau se retrage porumbelul.
 */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;

    const lot = await prisma.lot.findUnique({
      where: { id },
      include: {
        sale: { select: { titleRo: true } },
        auctions: {
          include: { order: { select: { id: true } }, _count: { select: { bids: true } } },
        },
      },
    });
    if (!lot) return jsonError("NOT_FOUND", 404);
    if (lot.status !== "DRAFT") return jsonError("NOT_DRAFT", 409, { status: lot.status });

    const cuOferte = lot.auctions.filter((a) => a._count.bids > 0).length;
    const cuComenzi = lot.auctions.filter((a) => a.order).length;
    if (cuOferte > 0 || cuComenzi > 0) {
      return jsonError("HAS_HISTORY", 409, { bids: cuOferte, orders: cuComenzi });
    }

    const auctionIds = lot.auctions.map((a) => a.id);
    const pigeonIds = lot.auctions.map((a) => a.pigeonId);

    await prisma.$transaction(async (tx) => {
      if (auctionIds.length > 0) {
        await tx.watchItem.deleteMany({ where: { auctionId: { in: auctionIds } } });
        await tx.auction.deleteMany({ where: { id: { in: auctionIds } } });
      }
      if (pigeonIds.length > 0) {
        // pozele și palmaresul pleacă odată cu porumbeii (cascade)
        await tx.pigeon.deleteMany({ where: { id: { in: pigeonIds } } });
      }
      await tx.lot.delete({ where: { id } });
      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          action: "LOT_DELETED",
          entity: "Lot",
          entityId: id,
          dataJson: JSON.stringify({
            sale: lot.sale.titleRo,
            number: lot.number,
            pigeons: pigeonIds.length,
          }),
        },
      });
    });

    return jsonOk({ deleted: true, pigeons: pigeonIds.length });
  } catch (e) {
    return handleApiError(e);
  }
}
