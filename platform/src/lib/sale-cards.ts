import { prisma } from "./db";
import type { SaleCardData } from "@/components/SaleCard";

/**
 * Licitațiile crescătorilor, pentru pagina „Licitații".
 *
 * Clientul: „când intru pe licitații să apară doar intrările spre licitații
 * CRESCĂTOR (foto cu licitațiile active). ATÂT, FĂRĂ PORUMBEI! Doar după ce dau
 * click pe licitația unui crescător îmi arată lotul sau loturile cu porumbei."
 *
 * Un card pe licitație, nu pe lot. Loturile aceluiași crescător au ore diferite,
 * așa că pe card se scrie ce se întâmplă prima dată (primul lot care se închide),
 * iar orele fiecărui lot se văd înăuntru.
 */
export async function getSaleCards(
  status: SaleCardData["status"],
  take = 30
): Promise<SaleCardData[]> {
  const sales = await prisma.sale.findMany({
    where: { archivedAt: null, lots: { some: { status } } },
    include: {
      breeder: true,
      lots: {
        where: { status },
        orderBy: { number: "asc" },
        include: {
          auctions: {
            where: { hiddenAt: null },
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
      },
    },
    take,
  });

  const carduri = sales.map((s) => {
    const loturi = s.lots;
    const porumbei = loturi.reduce((n, l) => n + l.auctions.length, 0);
    const oPoza = loturi
      .flatMap((l) => l.auctions)
      .find((a) => a.pigeon.media.length > 0)?.pigeon.media[0]?.url;

    // ce se întâmplă prima dată: programatele încep, celelalte se închid
    const momente = loturi.map((l) => (status === "SCHEDULED" ? l.startsAt : l.endsAt));
    const nextAt =
      status === "CLOSED"
        ? new Date(Math.max(...momente.map((d) => d.getTime())))
        : new Date(Math.min(...momente.map((d) => d.getTime())));
    const oreDiferite = new Set(momente.map((d) => d.getTime())).size > 1;

    return {
      slug: s.slug,
      titleRo: s.titleRo,
      titleEn: s.titleEn,
      breederName: s.breeder.name,
      breederPlace: [s.breeder.city, s.breeder.country].filter(Boolean).join(", ") || null,
      // poza crescătorului întâi — licitația e a lui; apoi coperta, apoi un porumbel
      imageUrl: s.breeder.photoUrl ?? s.coverUrl ?? oPoza ?? null,
      lotCount: loturi.length,
      pigeonCount: porumbei,
      status,
      nextAt,
      moreThanOneTime: oreDiferite,
    } satisfies SaleCardData;
  });

  // live și programate: cea mai apropiată întâi; încheiate: cea mai recentă
  return carduri.sort((a, b) =>
    status === "CLOSED"
      ? b.nextAt.getTime() - a.nextAt.getTime()
      : a.nextAt.getTime() - b.nextAt.getTime()
  );
}
