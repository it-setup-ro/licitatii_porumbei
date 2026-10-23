import { prisma } from "./db";
import type { AuctionCardData } from "@/components/AuctionCard";
import { lotLabel } from "./lots";

export type AuctionWithCard = {
  id: string;
  status: string;
  currency: string;
  startPriceCents: number;
  currentPriceCents: number;
  startsAt: Date;
  endsAt: Date;
  pigeon: {
    name: string;
    taglineRo: string | null;
    taglineEn: string | null;
    ringNumber: string;
    sex: string;
    birthYear: number;
    strain: string | null;
    media: { url: string }[];
  };
  _count: { bids: number };
  lotPosition?: number | null;
  lot?: { number: number } | null;
};

/**
 * Porumbeii dintr-un lot care n-a pornit nu se văd public.
 *
 * Clientul: „aș vrea să apară «în curând» să se vadă doar perioada când se va
 * da startul și crescătorul, fără porumbeii care vor fi în licitație”. Dacă
 * i-am scoate doar din pagina licitației, linkul unui porumbel ar circula pe
 * WhatsApp și secretul s-ar duce; de aceea filtrul stă în toate listele publice,
 * iar pagina porumbelului dă 404 până la start (vezi auctions/[id]/page.tsx).
 *
 * Porumbeii vânduți de oameni, fără lot, nu sunt atinși.
 */
export const LOTURI_PORNITE = {
  OR: [{ lotId: null }, { lot: { status: { in: ["LIVE", "CLOSED"] } } }],
};

export const cardInclude = {
  pigeon: { include: { media: { orderBy: { sortIdx: "asc" as const }, take: 1 } } },
  _count: { select: { bids: true } },
  lot: { select: { number: true } },
};

export function toCardData(a: AuctionWithCard): AuctionCardData {
  return {
    id: a.id,
    status: a.status,
    currency: a.currency,
    startPriceCents: a.startPriceCents,
    currentPriceCents: a.currentPriceCents,
    startsAt: a.startsAt,
    endsAt: a.endsAt,
    bidCount: a._count.bids,
    lotLabel: a.lot && a.lotPosition ? lotLabel(a.lot.number, a.lotPosition) : null,
    pigeon: {
      name: a.pigeon.name,
      taglineRo: a.pigeon.taglineRo,
      taglineEn: a.pigeon.taglineEn,
      ringNumber: a.pigeon.ringNumber,
      sex: a.pigeon.sex,
      birthYear: a.pigeon.birthYear,
      strain: a.pigeon.strain,
      imageUrl: a.pigeon.media[0]?.url ?? null,
    },
  };
}

export async function getAuctionsByStatus(status: string, take = 12) {
  const auctions = await prisma.auction.findMany({
    // porumbeii cu preț fix nu sunt licitații — au pagina lor, „Preț fix"
    where: { status, saleMode: "AUCTION", hiddenAt: null },
    include: cardInclude,
    orderBy: status === "CLOSED" ? { closedAt: "desc" } : { endsAt: "asc" },
    take,
  });
  return auctions.map(toCardData);
}
