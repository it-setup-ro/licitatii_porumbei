import { prisma } from "./db";
import type { LotCardData } from "@/components/LotCard";

/**
 * Loturile pentru lista de licitații, câte un card pe lot. Loturile în ciornă
 * nu apar — nu există încă pentru cumpărători.
 */
export async function getLotCards(
  status: LotCardData["status"],
  take = 30
): Promise<LotCardData[]> {
  const lots = await prisma.lot.findMany({
    where: { status },
    include: {
      sale: { include: { breeder: true } },
      auctions: {
        orderBy: { lotPosition: "asc" },
        select: {
          pigeon: {
            select: {
              media: { where: { type: "IMAGE" }, orderBy: { sortIdx: "asc" }, take: 1 },
            },
          },
        },
      },
    },
    // programatele după cel care începe primul; cele live după cel care se
    // închide primul; cele încheiate, cele mai recente întâi
    orderBy:
      status === "SCHEDULED"
        ? { startsAt: "asc" }
        : status === "LIVE"
          ? { endsAt: "asc" }
          : { endsAt: "desc" },
    take,
  });

  return lots.map((l) => {
    const firstPhoto = l.auctions.find((a) => a.pigeon.media.length > 0)?.pigeon.media[0]?.url;
    return {
      saleSlug: l.sale.slug,
      lotNumber: l.number,
      saleTitleRo: l.sale.titleRo,
      saleTitleEn: l.sale.titleEn,
      breederName: l.sale.breeder.name,
      breederPlace: [l.sale.breeder.city, l.sale.breeder.country].filter(Boolean).join(", ") || null,
      // Clientul: „aici să apară poza cu crescătorul, nu cu porumbel din loturi".
      // Poza crescătorului, altfel coperta licitației; porumbelul doar dacă nu e nimic.
      imageUrl: l.sale.breeder.photoUrl ?? l.sale.coverUrl ?? firstPhoto ?? null,
      pigeonCount: l.auctions.length,
      status: l.status as LotCardData["status"],
      startsAt: l.startsAt,
      endsAt: l.endsAt,
    };
  });
}
