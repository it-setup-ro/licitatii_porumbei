import SettlementSection from "@/components/admin/SettlementSection";
import { getFxInfo } from "@/lib/fx";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { lotIsLocked, lotLabel, saleStatus } from "@/lib/lots";
import AddLotForm from "@/components/admin/AddLotForm";
import LotAdminPanel, { type LotAdminData } from "@/components/admin/LotAdminPanel";

export const dynamic = "force-dynamic";

/**
 * O licitație de crescător, din administrare: loturile ei și porumbeii din
 * fiecare lot. De aici se pornesc loturile.
 */
export default async function AdminSalePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const [sale, settings] = await Promise.all([
    prisma.sale.findUnique({
      where: { id },
      include: {
        breeder: true,
        lots: {
          orderBy: { number: "asc" },
          include: {
            auctions: {
              orderBy: { lotPosition: "asc" },
              include: {
                pigeon: {
                  include: { media: { where: { type: "IMAGE" }, select: { id: true } } },
                },
                _count: { select: { bids: true } },
              },
            },
          },
        },
      },
    }),
    getSettings(),
  ]);
  if (!sale) notFound();

  const now = new Date();
  const lots: LotAdminData[] = sale.lots.map((lot) => ({
    id: lot.id,
    number: lot.number,
    status: lot.status,
    startsAt: lot.startsAt.toISOString(),
    endsAt: lot.endsAt.toISOString(),
    locked: lotIsLocked(lot.status, lot.startsAt, now),
    pigeons: lot.auctions.map((a) => ({
      auctionId: a.id,
      position: a.lotPosition ?? 0,
      label: lotLabel(lot.number, a.lotPosition ?? 0),
      name: a.pigeon.name,
      ringNumber: a.pigeon.ringNumber,
      sex: a.pigeon.sex,
      birthYear: a.pigeon.birthYear,
      startPriceCents: a.startPriceCents,
      currentPriceCents: a.currentPriceCents,
      bidCount: a._count.bids,
      imageCount: a.pigeon.media.length,
      status: a.status,
    })),
  }));

  const status = saleStatus(sale.lots);
  const lastLot = sale.lots[sale.lots.length - 1];

  const fx = await getFxInfo();

  return (
    <div>
      <a
        href={`/${locale}/admin/sales`}
        className="-my-1 mb-2 inline-block py-2.5 text-sm font-semibold text-wing-blue hover:underline"
      >
        ← Toate licitațiile
      </a>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-bold" data-testid="sale-title">
            {sale.titleRo}
          </h1>
          <p className="mt-1 text-ink/60">
            {sale.breeder.name} · comision {sale.commissionPercent}% ·{" "}
            {sale.lots.length} din {settings.saleMaxLots} loturi
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={`/${locale}/admin/sales?id=${sale.id}`}
            className="rounded-xl border border-ink/20 px-4 py-2 text-sm font-semibold hover:border-wing-blue"
          >
            Editează datele
          </a>
          {status !== "DRAFT" && (
            <a
              href={`/${locale}/sales/${sale.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="sale-view"
              className="rounded-xl border border-ink/20 px-4 py-2 text-sm font-semibold hover:border-wing-blue"
            >
              Vezi pe site ↗
            </a>
          )}
        </div>
      </div>

      {/*
        S-a întâmplat deja: licitația e făcută, lotul are porumbei, dar nimeni
        n-a apăsat „Start lot" — iar pe site nu apare nimic, fără să scrie de ce.
      */}
      {status === "DRAFT" && (
        <p
          className="mb-6 rounded-2xl border border-wing-orange/40 bg-wing-orange/5 p-4 text-sm"
          data-testid="sale-draft-notice"
        >
          <strong>Licitația nu se vede încă pe site.</strong> Loturile sunt ciornă. Adaugă porumbeii,
          apoi apasă <em>Start lot</em> la fiecare lot: dacă ora de început a trecut, lotul pornește
          pe loc; dacă nu, rămâne programat și pornește singur la ora scrisă.
        </p>
      )}

      <div className="space-y-6">
        {lots.map((lot) => (
          <LotAdminPanel
            key={lot.id}
            saleId={sale.id}
            lot={lot}
            locale={locale}
            currency={settings.platformCurrency}
            maxPigeons={settings.lotMaxPigeons}
            fx={fx}
          />
        ))}
      </div>

      {sale.lots.length < settings.saleMaxLots ? (
        <AddLotForm
          saleId={sale.id}
          nextNumber={(lastLot?.number ?? 0) + 1}
          suggestedStart={lastLot ? lastLot.endsAt.toISOString() : null}
        />
      ) : (
        <p className="mt-6 text-sm text-ink/60" data-testid="sale-lots-full">
          Licitația are deja {settings.saleMaxLots} loturi, cât permit Setările.
        </p>
      )}

      <SettlementSection
        group={{ saleId: sale.id }}
        title={sale.breeder.name}
        subtitle={`Comisionul licitației: ${sale.commissionPercent}%. Intră doar porumbeii plătiți și nedecontați.`}
        currency={settings.platformCurrency}
      />
    </div>
  );
}
