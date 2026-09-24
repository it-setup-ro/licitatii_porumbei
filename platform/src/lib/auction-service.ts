import { prisma } from "./db";
import { getSettings } from "./settings";
import {
  computeBid,
  computeExtension,
  incrementFor,
  minimumAcceptableMax,
  reserveState,
} from "./bidding";

export { reserveState };
import { emitAuctionEvent } from "./events";
import { publicBidderName } from "./mask-name";
import { planBidRows } from "./bid-history";
import { notify } from "./notify";
import { notifyLotsEnding } from "./lot-notices";
import { notifyBuyerWithPaymentDetails } from "./orders";

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
        | "SELLER_NOT_ALLOWED"
        | "ACCOUNT_PENDING"
        | "ACCOUNT_REJECTED";
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
  // reper: tot ce se scrie de aici încolo aparține acestei oferte
  const inceput = new Date();
  const settings = await getSettings();

  const bidder = await prisma.user.findUnique({ where: { id: bidderId } });
  if (!bidder || bidder.suspendedAt) return { ok: false, error: "NOT_FOUND" };

  // Conturile noi le aprobă administratorul înainte să poată licita.
  if (settings.accountApprovalRequired && bidder.role !== "ADMIN") {
    if (bidder.accountStatus === "REJECTED") return { ok: false, error: "ACCOUNT_REJECTED" };
    if (bidder.accountStatus !== "APPROVED") return { ok: false, error: "ACCOUNT_PENDING" };
  }

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
      reserveCents: auction.reservePriceCents,
    });

    if (!outcome.accepted) {
      result = { ok: false, error: "BELOW_MINIMUM", minimumCents: outcome.minimumCents };
      return;
    }

    // Anti-sniping. Porumbeii dintr-un lot folosesc regulile înghețate la
    // pornirea lotului, nu pe cele de acum din Setări.
    const lot = auction.lotId ? await tx.lot.findUnique({ where: { id: auction.lotId } }) : null;
    const newEndsAt = computeExtension({
      now,
      endsAt: auction.endsAt,
      snipeWindowMinutes: lot?.snipeWindowMinutes ?? settings.snipeWindowMinutes,
      extensionMinutes: lot?.extensionMinutes ?? settings.extensionMinutes,
      extensionsCount: auction.extensionsCount,
      maxExtensions: lot?.maxExtensions ?? settings.maxExtensions,
    });

    // Istoricul e un jurnal de fapte: nu se rescrie niciun rând deja scris.
    // Planul spune ce se adaugă (vezi lib/bid-history.ts).
    const plan = planBidRows({ bidderId, maxCents, outcome, leader });

    if (plan.plafonNou !== null && leadingBid) {
      await tx.bid.update({
        where: { id: leadingBid.id },
        data: { maxAmountCents: plan.plafonNou },
      });
    }
    if (plan.vechiulLiderNuMaiConduce && leadingBid) {
      await tx.bid.update({ where: { id: leadingBid.id }, data: { isLeading: false } });
    }
    for (const rand of plan.randuri) {
      await tx.bid.create({ data: { auctionId, ...rand } });
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
    // „N oferte” = câte au dat oamenii; răspunsurile automate nu se numără
    const bidCount = await prisma.bid.count({ where: { auctionId, auto: false } });
    const leadingNow = await prisma.bid.findFirst({
      where: { auctionId, isLeading: true },
    });
    // Minimul urmator merge pe fir odata cu pretul. Fara el, un ecran deschis in
    // alta parte arata pretul nou, dar continua sa propuna suma veche — iar cine
    // o trimite primeste „oferta prea mica" fara sa inteleaga de ce.
    const minNextCents = (await nextMinimumForAuction(auctionId)) ?? r.priceCents;
    const bidderCount = (
      await prisma.bid.findMany({
        where: { auctionId },
        select: { bidderId: true },
        distinct: ["bidderId"],
      })
    ).length;
    // rândurile scrise chiar acum: oferta omului și, uneori, răspunsul automat
    const scriseAcum = await prisma.bid.findMany({
      where: { auctionId, createdAt: { gte: inceput } },
      orderBy: { createdAt: "asc" },
      include: { bidder: { select: { nickname: true, name: true } } },
    });
    const settingsNow = await getSettings();
    const stepCents = incrementFor(r.priceCents, settingsNow.increments);
    const auctionNow = await prisma.auction.findUnique({ where: { id: auctionId } });
    const reserve = reserveState(auctionNow?.reservePriceCents ?? null, r.priceCents);

    emitAuctionEvent({
      kind: "bid",
      auctionId,
      priceCents: r.priceCents,
      minNextCents,
      stepCents,
      bidCount,
      bidderCount,
      reserve,
      leadingBidderId: leadingNow?.bidderId ?? bidderId,
      endsAt: r.endsAt.toISOString(),
      extended: r.extended,
      newBids: scriseAcum.map((b) => ({
        id: b.id,
        name: publicBidderName(b.bidder.nickname, b.bidder.name),
        amountCents: b.amountCents,
        at: b.createdAt.toISOString(),
        auto: b.auto,
      })),
      leadingBidId: leadingNow?.id ?? null,
    });
    if (outbidUserId) {
      await notify(outbidUserId, "OUTBID", { priceCents: r.priceCents }, `/auctions/${auctionId}`);
    }
  }
  return r ?? { ok: false, error: "NOT_FOUND" };
}

/** Cati oameni distincti au licitat pe lotul asta. */
export async function bidderCountForAuction(auctionId: string): Promise<number> {
  const rows = await prisma.bid.findMany({
    where: { auctionId },
    select: { bidderId: true },
    distinct: ["bidderId"],
  });
  return rows.length;
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

/** Cu cat timp inainte de final se anunta cei implicati. */
const ENDING_SOON_MINUTES = 60;

/**
 * Anunta „licitatia se apropie de final" ofertantilor si celor care au pus lotul
 * la favorite.
 *
 * Tipul de notificare exista de la inceput, dar nu-l trimitea nimeni niciodata.
 * `endingNotifiedAt` tine minte ca s-a trimis, ca sa nu plece la fiecare trecere.
 */
async function notifyEndingSoon(now: Date) {
  const prag = new Date(now.getTime() + ENDING_SOON_MINUTES * 60_000);
  const auctions = await prisma.auction.findMany({
    where: {
      status: "LIVE",
      endingNotifiedAt: null,
      // porumbeii din loturi primesc un singur aviz pe lot, grupat (lot-notices)
      lotId: null,
      endsAt: { gt: now, lte: prag },
    },
    include: { pigeon: true },
  });

  for (const a of auctions) {
    await prisma.auction.update({
      where: { id: a.id },
      data: { endingNotifiedAt: now },
    });

    const ofertanti = await prisma.bid.findMany({
      where: { auctionId: a.id },
      select: { bidderId: true },
      distinct: ["bidderId"],
    });
    const favoriti = await prisma.watchItem.findMany({
      where: { auctionId: a.id },
      select: { userId: true },
    });

    const destinatari = new Set([
      ...ofertanti.map((o) => o.bidderId),
      ...favoriti.map((f) => f.userId),
    ]);
    for (const userId of destinatari) {
      await notify(userId, "AUCTION_ENDING", { lot: a.pigeon.name }, `/auctions/${a.id}`);
    }
  }
}

/** Porneste licitatiile programate si inchide licitatiile expirate. Idempotent. */
export async function sweepAuctions(): Promise<{ started: number; closed: number }> {
  const now = new Date();

  // loturile programate pornesc la ora lor; porumbeii lor pornesc mai jos,
  // odată cu celelalte licitații programate
  await prisma.lot.updateMany({
    where: { status: "SCHEDULED", startsAt: { lte: now } },
    data: { status: "LIVE" },
  });

  const toStart = await prisma.auction.findMany({
    where: { status: "SCHEDULED", startsAt: { lte: now } },
  });
  for (const auction of toStart) {
    await prisma.auction.update({ where: { id: auction.id }, data: { status: "LIVE" } });
  }

  const due = await prisma.auction.findMany({
    where: { status: "LIVE", endsAt: { lte: now } },
  });

  await notifyEndingSoon(now);
  await notifyLotsEnding(now);

  let closed = 0;
  for (const auction of due) {
    const settings = await getSettings();
    await prisma.$transaction(async (tx) => {
      const fresh = await tx.auction.findUnique({ where: { id: auction.id } });
      if (!fresh || fresh.status !== "LIVE" || fresh.endsAt > new Date()) return;

      const winningBid = await tx.bid.findFirst({
        where: { auctionId: fresh.id, isLeading: true },
      });

      /*
        Pretul de rezerva: suma sub care vanzatorul nu vinde. Daca licitatia s-a
        oprit sub ea, lotul NU se adjudeca — nu exista castigator si nu se face
        comanda. Altfel l-am obliga pe crescator sa dea un porumbel de valoare
        pe o suma pe care n-a acceptat-o niciodata.
      */
      const reserveMet =
        fresh.reservePriceCents === null || fresh.currentPriceCents >= fresh.reservePriceCents;
      const adjudecat = Boolean(winningBid) && reserveMet;

      await tx.auction.update({
        where: { id: fresh.id },
        data: {
          status: "CLOSED",
          closedAt: new Date(),
          winnerId: adjudecat ? winningBid!.bidderId : null,
          winningBidId: adjudecat ? winningBid!.id : null,
          reserveNotMet: Boolean(winningBid) && !reserveMet,
        },
      });

      if (adjudecat && winningBid) {
        // Porumbeii dintr-un lot: comisionul stabilit pe licitația crescătorului.
        const saleOfLot = fresh.lotId
          ? (await tx.lot.findUnique({ where: { id: fresh.lotId }, include: { sale: true } }))
              ?.sale
          : null;
        const commissionPercent = saleOfLot
          ? saleOfLot.commissionPercent
          : fresh.listingType === "ASSISTED"
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
      const lotName = final.pigeon.name;

      // licitatie oprita sub pretul de rezerva: nu s-a vandut, dar merita spus
      if (final.reserveNotMet) {
        await notify(
          final.sellerId,
          "RESERVE_NOT_MET",
          { lot: lotName, priceCents: final.currentPriceCents },
          `/account/lots`
        );
      }

      if (final.winnerId) {
        // faza 2: câștigătorul primește suma și datele de plată ale firmei, cu
        // legătura spre comanda lui
        const winOrder = await prisma.order.findUnique({
          where: { auctionId: final.id },
          select: { id: true },
        });
        if (winOrder) {
          await notifyBuyerWithPaymentDetails(winOrder.id, "WON");
        } else {
          await notify(
            final.winnerId,
            "AUCTION_WON",
            { lot: lotName, priceCents: final.currentPriceCents },
            `/auctions/${final.id}`
          );
        }
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
  // Un lot se închide când nu mai are niciun porumbel deschis: prelungirile pot
  // ține unii porumbei după ora lotului.
  const lotsDue = await prisma.lot.findMany({
    where: { status: "LIVE", endsAt: { lte: now } },
    select: { id: true },
  });
  for (const lot of lotsDue) {
    const open = await prisma.auction.count({
      where: { lotId: lot.id, status: { in: ["LIVE", "SCHEDULED"] } },
    });
    if (open === 0) {
      await prisma.lot.update({
        where: { id: lot.id },
        data: { status: "CLOSED", closedAt: new Date() },
      });
    }
  }

  return { started: toStart.length, closed };
}
