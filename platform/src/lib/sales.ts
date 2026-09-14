import { prisma } from "./db";
import { saleStatus } from "./lots";
import type { SaleCardData } from "@/components/SaleCard";

/**
 * Licitațiile de crescător care se văd pe site: au cel puțin un lot pornit sau
 * programat. Cele în care toate loturile sunt în ciornă nu există încă pentru
 * cumpărători.
 */
export async function getVisibleSales(opts: { activeOnly?: boolean; take?: number } = {}) {
  const sales = await prisma.sale.findMany({
    where: {
      lots: {
        some: { status: { in: opts.activeOnly ? ["LIVE", "SCHEDULED"] : ["LIVE", "SCHEDULED", "CLOSED"] } },
      },
    },
    include: {
      breeder: true,
      lots: {
        where: { status: { not: "DRAFT" } },
        orderBy: { number: "asc" },
        include: {
          auctions: {
            orderBy: { lotPosition: "asc" },
            take: 1,
            include: { pigeon: { include: { media: { where: { type: "IMAGE" }, take: 1 } } } },
          },
          _count: { select: { auctions: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: opts.take ?? 30,
  });

  return sales
    .map((s): SaleCardData => {
      const status = saleStatus(s.lots);
      const live = s.lots.filter((l) => l.status === "LIVE");
      const scheduled = s.lots.filter((l) => l.status === "SCHEDULED");
      const nextAt =
        status === "LIVE"
          ? new Date(Math.min(...live.map((l) => l.endsAt.getTime())))
          : status === "UPCOMING"
            ? new Date(Math.min(...scheduled.map((l) => l.startsAt.getTime())))
            : null;
      const firstPhoto = s.lots.flatMap((l) => l.auctions).find((a) => a.pigeon.media.length > 0)
        ?.pigeon.media[0]?.url;
      return {
        slug: s.slug,
        titleRo: s.titleRo,
        titleEn: s.titleEn,
        // coperta, altfel poza crescătorului, altfel primul porumbel cu poză
        imageUrl: s.coverUrl ?? s.breeder.photoUrl ?? firstPhoto ?? null,
        breederName: s.breeder.name,
        breederPlace: [s.breeder.city, s.breeder.country].filter(Boolean).join(", ") || null,
        lotCount: s.lots.length,
        pigeonCount: s.lots.reduce((n, l) => n + l._count.auctions, 0),
        status,
        nextAt,
      };
    })
    .sort((a, b) => rank(a.status) - rank(b.status));
}

/** Întâi cele care curg, apoi cele programate, apoi cele încheiate. */
function rank(status: SaleCardData["status"]) {
  return status === "LIVE" ? 0 : status === "UPCOMING" ? 1 : 2;
}
