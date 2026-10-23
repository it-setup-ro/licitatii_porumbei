import { prisma } from "./db";
import { publicBidderName } from "./mask-name";

/**
 * Ultimele oferte de pe tot site-ul, pentru prima pagină.
 *
 * Așa face și voiajor.net („110 EURO la 15:31 de ALEX"): omul care intră prima
 * dată vede dintr-o privire că se licitează acum, nu doar că există licitații.
 *
 * Numele sunt mascate la fel ca în istoricul unei licitații (porecla, altfel
 * numele scurtat) — pagina asta nu dezvăluie mai mult decât pagina porumbelului.
 * Răspunsurile automate ale platformei nu intră: ar arăta ca oferte pe care
 * nu le-a dat nimeni.
 */
export type LatestBid = {
  auctionId: string;
  pigeonName: string;
  amountCents: number;
  currency: string;
  at: Date;
  name: string;
};

export async function latestBids(take = 5): Promise<LatestBid[]> {
  const randuri = await prisma.bid.findMany({
    where: {
      auto: false,
      auction: { hiddenAt: null, status: "LIVE", saleMode: "AUCTION" },
    },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      amountCents: true,
      createdAt: true,
      auction: { select: { id: true, currency: true, pigeon: { select: { name: true } } } },
      bidder: { select: { nickname: true, name: true } },
    },
  });

  return randuri.map((b) => ({
    auctionId: b.auction.id,
    pigeonName: b.auction.pigeon.name,
    amountCents: b.amountCents,
    currency: b.auction.currency,
    at: b.createdAt,
    name: publicBidderName(b.bidder.nickname, b.bidder.name),
  }));
}
