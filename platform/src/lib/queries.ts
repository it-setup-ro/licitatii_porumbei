import { prisma } from "./db";
import type { AuctionCardData } from "@/components/AuctionCard";

type AuctionWithCard = {
  id: string;
  status: string;
  currency: string;
  startPriceCents: number;
  currentPriceCents: number;
  startsAt: Date;
  endsAt: Date;
  pigeon: {
    titleRo: string;
    titleEn: string;
    ringNumber: string;
    sex: string;
    birthYear: number;
    strain: string | null;
    media: { url: string }[];
  };
  _count: { bids: number };
};

export const cardInclude = {
  pigeon: { include: { media: { orderBy: { sortIdx: "asc" as const }, take: 1 } } },
  _count: { select: { bids: true } },
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
    pigeon: {
      titleRo: a.pigeon.titleRo,
      titleEn: a.pigeon.titleEn,
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
