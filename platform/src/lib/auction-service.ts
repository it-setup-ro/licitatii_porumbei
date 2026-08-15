import { prisma } from "./db";
import { getSettings } from "./settings";
import { computeBid, computeExtension, minimumAcceptableMax } from "./bidding";
import { emitAuctionEvent } from "./events";
import { notify } from "./notify";

/**
 * Serviciul de licitatii: leaga logica pura (bidding.ts) de DB.
 * Toate operatiile pe pretul curent ruleaza intr-o tranzactie serializata
 * ca sa nu existe race-condition la ultima oferta.
 */

export type PlaceBidResult =
  | { ok: true; priceCents: number; leading: boolean; extended: boolean; endsAt: Date }
  | {
      ok: false;
      error:
        | "NOT_FOUND"
        | "NOT_LIVE"
        | "OWN_AUCTION"
        | "BELOW_MINIMUM"
        | "BID_LIMIT_EXCEEDED"
        | "SELLER_NOT_ALLOWED";
      minimumCents?: number;
      limitCents?: number;
    };

/** Postgres respinge tranzactiile serializabile aflate in conflict cu 40001. */
function isSerializationConflict(e: unknown): boolean {
  const code = (e as { code?: string })?.code;
  return code === "P2034" || code === "40001";
}

/**
 * Plaseaza o oferta, reincercand daca doua oferte simultane intra in conflict.
 * Fara retry, un ofertant onest ar primi eroare doar pentru ca altcineva a
 * licitat in aceeasi milisecunda.
 */
export async function placeBid(
  auctionId: string,
  bidderId: string,
  maxCents: number
): Promise<PlaceBidResult> {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      return await placeBidOnce(auctionId, bidderId, maxCents);
    } catch (e) {
      if (!isSerializationConflict(e) || attempt === 3) throw e;
      // asteptare scurta, crescatoare, ca cele doua cereri sa nu reintre in coliziune
      await new Promise((r) => setTimeout(r, 25 * (attempt + 1)));
    }
  }
  return { ok: false, error: "NOT_FOUND" };
}

async function placeBidOnce(
  auctionId: string,
  bidderId: string,
  maxCents: number
): Promise<PlaceBidResult> {
  const settings = await getSettings();

  const bidder = await prisma.user.findUnique({ where: { id: bidderId } });
  if (!bidder || bidder.suspendedAt) return { ok: false, error: "NOT_FOUND" };

  // Limita pentru conturi noi (KYC hibrid, client-decisions B8)
  const limit =
    bidder.completedOrders > 0
      ? null
      : bidder.bidLimitOverride ?? settings.newAccountBidLimitCents;
  if (limit !== null && maxCents > limit) {
    return { ok: false, error: "BID_LIMIT_EXCEEDED", limitCents: limit };
  }

  let outbidUserId: string | null = null;
  let result: PlaceBidResult | null = null;

  // Serializable: doua oferte simultane pe acelasi lot nu mai pot citi acelasi
  // "lider curent" si scrie amandoua isLeading=true (doi lideri / pret gresit).
  // Postgres aborteaza una dintre ele cu 40001, iar noi o reluam (retry mai jos).
  await prisma.$transaction(async (tx) => {
    const auction = await tx.auction.findUnique({ where: { id: auctionId } });
    if (!auction) {
      result = { ok: false, error: "NOT_FOUND" };
      return;
    }
    if (auction.sellerId === bidderId) {
      result = { ok: false, error: "OWN_AUCTION" };
      return;
    }
    const now = new Date();
    if (auction.status !== "LIVE" || auction.endsAt <= now || auction.startsAt > now) {
      result = { ok: false, error: "NOT_LIVE" };
      return;
    }

    const leadingBid = await tx.bid.findFirst({
      where: { auctionId, isLeading: true },
      orderBy: { createdAt: "desc" },
    });
    const leader = leadingBid
      ? { bidderId: leadingBid.bidderId, maxCents: leadingBid.maxAmountCents }
      : null;

    const tiers = settings.increments;
    const outcome = computeBid({
      bidderId,
      maxCents,
      startPriceCents: auction.startPriceCents,
      currentPriceCents: auction.currentPriceCents,
      leader,
      tiers,
    });

    if (!outcome.accepted) {
      result = { ok: false, error: "BELOW_MINIMUM", minimumCents: outcome.minimumCents };
      return;
    }

    // Anti-sniping
    const newEndsAt = computeExtension({
      now,
      endsAt: auction.endsAt,
      snipeWindowMinutes: settings.snipeWindowMinutes,
      extensionMinutes: settings.extensionMinutes,
      extensionsCount: auction.extensionsCount,
      maxExtensions: settings.maxExtensions,
    });

    if (outcome.raisedOwnCeiling && leadingBid) {
      await tx.bid.update({
        where: { id: leadingBid.id },
        data: { maxAmountCents: maxCents },
      });
    } else {
      if (leadingBid && outcome.newLeader.bidderId !== leadingBid.bidderId) {
        await tx.bid.update({ where: { id: leadingBid.id }, data: { isLeading: false } });
      }
      await tx.bid.create({
        data: {
          auctionId,
          bidderId,
          amountCents: outcome.newPriceCents,
          maxAmountCents: maxCents,
          isLeading: outcome.callerIsLeading,
        },
      });
      // Cand plafonul nou e insuficient, liderul ramane dar oferta lui vizibila creste:
      if (!outcome.callerIsLeading && leadingBid) {
        await tx.bid.update({
          where: { id: leadingBid.id },
          data: { amountCents: outcome.newPriceCents, isLeading: true },
        });
      }
    }

    await tx.auction.update({
      where: { id: auctionId },
      data: {
        currentPriceCents: outcome.newPriceCents,
        ...(newEndsAt
          ? { endsAt: newEndsAt, extensionsCount: { increment: 1 } }
          : {}),
      },
    });

    if (outcome.outbidBidderId && outcome.outbidBidderId !== bidderId) {
      outbidUserId = outcome.outbidBidderId;
    }

    result = {
      ok: true,
      priceCents: outcome.newPriceCents,
      leading: outcome.callerIsLeading,
      extended: newEndsAt !== null,
      endsAt: newEndsAt ?? auction.endsAt,
    };
  }, { isolationLevel: "Serializable" });

  const r = result as PlaceBidResult | null;
  if (r && r.ok) {
    const bidCount = await prisma.bid.count({ where: { auctionId } });
    const leadingNow = await prisma.bid.findFirst({
      where: { auctionId, isLeading: true },
    });
    emitAuctionEvent({
      kind: "bid",
      auctionId,
      priceCents: r.priceCents,
      bidCount,
      leadingBidderId: leadingNow?.bidderId ?? bidderId,
      endsAt: r.endsAt.toISOString(),
      extended: r.extended,
    });
    if (outbidUserId) {
      await notify(outbidUserId, "OUTBID", { priceCents: r.priceCents }, `/auctions/${auctionId}`);
    }
  }
  return r ?? { ok: false, error: "NOT_FOUND" };
}

/** Minimul acceptat pentru urmatoarea oferta (pentru UI). */
export async function nextMinimumForAuction(auctionId: string): Promise<number | null> {
  const auction = await prisma.auction.findUnique({ where: { id: auctionId } });
  if (!auction) return null;
  const settings = await getSettings();
  const hasBids = (await prisma.bid.count({ where: { auctionId } })) > 0;
  return minimumAcceptableMax(
    auction.currentPriceCents,
    hasBids,
    auction.startPriceCents,
    settings.increments
  );
}

/** Porneste licitatiile programate si inchide licitatiile expirate. Idempotent. */
export async function sweepAuctions(): Promise<{ started: number; closed: number }> {
  const now = new Date();

  const toStart = await prisma.auction.findMany({
    where: { status: "SCHEDULED", startsAt: { lte: now } },
  });
  for (const auction of toStart) {
    await prisma.auction.update({ where: { id: auction.id }, data: { status: "LIVE" } });
  }

  const due = await prisma.auction.findMany({
    where: { status: "LIVE", endsAt: { lte: now } },
  });

  let closed = 0;
  for (const auction of due) {
    const settings = await getSettings();
    await prisma.$transaction(async (tx) => {
      const fresh = await tx.auction.findUnique({ where: { id: auction.id } });
      if (!fresh || fresh.status !== "LIVE" || fresh.endsAt > new Date()) return;

      const winningBid = await tx.bid.findFirst({
        where: { auctionId: fresh.id, isLeading: true },
      });

      await tx.auction.update({
        where: { id: fresh.id },
        data: {
          status: "CLOSED",
          closedAt: new Date(),
          winnerId: winningBid?.bidderId ?? null,
          winningBidId: winningBid?.id ?? null,
        },
      });

      if (winningBid) {
        const commissionPercent =
          fresh.listingType === "ASSISTED"
            ? settings.commissionPercent + settings.assistedExtraPercent
            : settings.commissionPercent;
        await tx.order.create({
          data: {
            auctionId: fresh.id,
            buyerId: winningBid.bidderId,
            sellerId: fresh.sellerId,
            amountCents: fresh.currentPriceCents,
            commissionCents: Math.round((fresh.currentPriceCents * commissionPercent) / 100),
            currency: fresh.currency,
          },
        });
      }
      closed++;
    });

    const final = await prisma.auction.findUnique({
      where: { id: auction.id },
      include: { pigeon: true },
    });
    if (final && final.status === "CLOSED") {
      emitAuctionEvent({
        kind: "closed",
        auctionId: final.id,
        winnerId: final.winnerId,
        priceCents: final.currentPriceCents,
      });
      const lotName = final.pigeon.titleRo;
      if (final.winnerId) {
        await notify(
          final.winnerId,
          "AUCTION_WON",
          { lot: lotName, priceCents: final.currentPriceCents },
          `/auctions/${final.id}`
        );
        await notify(
          final.sellerId,
          "SELLER_SOLD",
          { lot: lotName, priceCents: final.currentPriceCents },
          `/account/sales`
        );
        const losers = await prisma.bid.findMany({
          where: { auctionId: final.id, bidderId: { not: final.winnerId } },
          select: { bidderId: true },
          distinct: ["bidderId"],
        });
        for (const l of losers) {
          await notify(l.bidderId, "AUCTION_LOST", { lot: lotName }, `/auctions/${final.id}`);
        }
      }
    }
  }
  return { started: toStart.length, closed };
}
