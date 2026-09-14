import { prisma } from "./db";
import { getSettings } from "./settings";
import { checkLotStart, statusAtStart, type StartProblem } from "./lots";

/**
 * Pornirea unui lot: toți porumbeii deodată, niciodată unul câte unul.
 *
 * Totul se întâmplă într-o singură tranzacție serializată: două apăsări
 * simultane pe „Start" (doi administratori, sau un dublu-clic) nu pot porni
 * lotul de două ori și nici nu pot lăsa jumătate din porumbei în ciornă.
 */

export type StartLotResult =
  | { ok: true; status: "LIVE" | "SCHEDULED" }
  | { ok: false; problems: StartProblem[] }
  | { ok: false; notFound: true };

export async function startLot(lotId: string, adminId: string): Promise<StartLotResult> {
  const settings = await getSettings();

  return prisma.$transaction(
    async (tx) => {
      const now = new Date();
      const lot = await tx.lot.findUnique({
        where: { id: lotId },
        include: {
          auctions: {
            include: {
              pigeon: { include: { media: { where: { type: "IMAGE" }, select: { id: true } } } },
            },
          },
        },
      });
      if (!lot) return { ok: false, notFound: true } as const;

      const problems = checkLotStart({
        status: lot.status,
        startsAt: lot.startsAt,
        endsAt: lot.endsAt,
        now,
        maxPigeons: settings.lotMaxPigeons,
        pigeons: lot.auctions.map((a) => ({
          position: a.lotPosition ?? 0,
          ringNumber: a.pigeon.ringNumber,
          birthYear: a.pigeon.birthYear,
          sex: a.pigeon.sex,
          imageCount: a.pigeon.media.length,
          startPriceCents: a.startPriceCents,
        })),
      });
      if (problems.length > 0) return { ok: false, problems } as const;

      const status = statusAtStart(lot.startsAt, now);

      await tx.lot.update({
        where: { id: lot.id },
        data: {
          status,
          // regulile de prelungire se îngheață acum: o schimbare ulterioară în
          // Setări nu atinge un lot care a pornit
          snipeWindowMinutes: settings.snipeWindowMinutes,
          extensionMinutes: settings.extensionMinutes,
          maxExtensions: settings.maxExtensions,
          startedAt: now,
          startedById: adminId,
        },
      });

      await tx.auction.updateMany({
        where: { lotId: lot.id },
        data: {
          status,
          startsAt: lot.startsAt,
          endsAt: lot.endsAt,
          originalEndsAt: lot.endsAt,
          approvedAt: now,
          approvedById: adminId,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: adminId,
          action: "LOT_STARTED",
          entity: "Lot",
          entityId: lot.id,
          dataJson: JSON.stringify({ status, pigeons: lot.auctions.length }),
        },
      });

      return { ok: true, status } as const;
    },
    { isolationLevel: "Serializable" }
  );
}

/** Renumerotează porumbeii unui lot 1, 2, 3… în ordinea dată. */
export async function renumberLot(
  tx: Pick<typeof prisma, "auction">,
  orderedAuctionIds: string[]
) {
  for (let i = 0; i < orderedAuctionIds.length; i++) {
    await tx.auction.update({
      where: { id: orderedAuctionIds[i] },
      data: { lotPosition: i + 1 },
    });
  }
}
