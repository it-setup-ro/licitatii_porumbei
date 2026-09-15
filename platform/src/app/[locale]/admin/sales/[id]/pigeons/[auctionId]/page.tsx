import { getEurRate } from "@/lib/fx";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { parseTraits } from "@/lib/pigeon-traits";
import { lotIsLocked, lotLabel } from "@/lib/lots";
import LotEditForm, { type LotEditData } from "@/components/LotEditForm";

export const dynamic = "force-dynamic";

/**
 * Fișa completă a unui porumbel dintr-un lot: poze, pedigree, video,
 * rezultate, caracteristici. Același formular ca până acum.
 */
export default async function AdminLotPigeonPage({
  params,
}: {
  params: Promise<{ locale: string; id: string; auctionId: string }>;
}) {
  const { locale, id: saleId, auctionId } = await params;
  setRequestLocale(locale);

  const [auction, settings] = await Promise.all([
    prisma.auction.findUnique({
      where: { id: auctionId },
      include: {
        lot: { include: { sale: true } },
        pigeon: {
          include: {
            media: { orderBy: { sortIdx: "asc" } },
            results: { orderBy: [{ year: "desc" }, { place: "asc" }] },
          },
        },
      },
    }),
    getSettings(),
  ]);
  if (!auction || !auction.lot || auction.lot.saleId !== saleId) notFound();

  const lot = auction.lot;
  const locked = lotIsLocked(lot.status, lot.startsAt, new Date());
  const p = auction.pigeon;

  const data: LotEditData = {
    id: auction.id,
    ringNumber: p.ringNumber,
    birthYear: p.birthYear,
    sex: p.sex,
    name: p.name,
    taglineRo: p.taglineRo ?? "",
    taglineEn: p.taglineEn ?? "",
    descRo: p.descRo ?? "",
    descEn: p.descEn ?? "",
    bredBy: p.bredBy ?? "",
    offeredBy: p.offeredBy ?? "",
    color: p.color ?? "",
    strain: p.strain ?? "",
    pedigreeUrl: p.pedigreeUrl ?? "",
    traits: parseTraits(p.traitsJson),
    media: p.media.map((m) => ({ url: m.url, type: m.type === "VIDEO" ? "VIDEO" : "IMAGE" })),
    results: p.results.map((r) => ({
      raceName: r.raceName,
      distanceKm: r.distanceKm ? String(r.distanceKm) : "",
      place: String(r.place),
      participants: r.participants ? String(r.participants) : "",
    })),
    startPrice: String(auction.startPriceCents / 100),
  };

  const eurRate = await getEurRate();

  return (
    <div className="max-w-2xl">
      <a
        href={`/${locale}/admin/sales/${saleId}`}
        className="-my-1 mb-2 inline-block py-2.5 text-sm font-semibold text-wing-blue hover:underline"
      >
        ← {lot.sale.titleRo} · Lotul {lot.number}
      </a>
      <h1 className="font-display mb-1 text-3xl font-bold">
        Lotul {lotLabel(lot.number, auction.lotPosition ?? 0)} · {p.name}
      </h1>
      <p className="mb-6 text-ink/60">{p.ringNumber}</p>

      {locked && (
        <p
          className="mb-6 rounded-2xl border border-wing-orange/40 bg-wing-orange/5 p-4 text-sm"
          data-testid="pigeon-lot-started"
        >
          Lotul a pornit: seria, anul, sexul și prețurile nu se mai schimbă. Poți corecta numele,
          textele și pozele — orice corectură rămâne în jurnal.
        </p>
      )}

      <LotEditForm
        lot={data}
        scope="FULL"
        isAdmin
        currency={settings.platformCurrency}
        minStartCents={settings.minStartPriceCents}
        eurRate={eurRate}
      />
    </div>
  );
}
