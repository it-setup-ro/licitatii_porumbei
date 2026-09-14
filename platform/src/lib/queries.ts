import { prisma } from "./db";
import type { AuctionCardData } from "@/components/AuctionCard";
import { lotLabel } from "./lots";

type AuctionWithCard = {
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
    where: { status },
    include: cardInclude,
    orderBy: status === "CLOSED" ? { closedAt: "desc" } : { endsAt: "asc" },
    take,
  });
  return auctions.map(toCardData);
}
