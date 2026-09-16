import { equivalentLabel } from "@/lib/fx-math";
import { getEurRate } from "@/lib/fx";
import { notFound } from "next/navigation";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { getSettings } from "@/lib/settings";
import { lotLabel, salePeriod, saleStatus } from "@/lib/lots";
import { cardInclude, toCardData } from "@/lib/queries";
import AuctionCard from "@/components/AuctionCard";
import Countdown from "@/components/Countdown";
import RichText from "@/components/RichText";
import ViewToggle from "@/components/ViewToggle";
import { intlLocale } from "@/lib/locales";

export const dynamic = "force-dynamic";

/**
 * Pagina licitației unui crescător, după modelul PIPA: prezentarea, crescătorul,
 * cifrele, apoi loturile — fiecare pliabil, cu ora lui și porumbeii lui.
 */
export default async function SalePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("sales");
  const ta = await getTranslations("auction");
  const currentLocale = await getLocale();
  // conținutul scris de administrator: română sau, altfel, engleză
  const en = currentLocale !== "ro";

  const [sale, settings] = await Promise.all([
    prisma.sale.findUnique({
      where: { slug },
      include: {
        breeder: true,
        lots: {
          // loturile în ciornă nu există încă pentru cumpărători
          where: { status: { not: "DRAFT" } },
          orderBy: { number: "asc" },
          include: { auctions: { orderBy: { lotPosition: "asc" }, include: cardInclude } },
        },
      },
    }),
    getSettings(),
  ]);
  if (!sale || sale.lots.length === 0) notFound();
  const eurRate = await getEurRate();

  const title = en ? sale.titleEn : sale.titleRo;
  const desc = en ? (sale.descEn ?? sale.descRo) : sale.descRo;
  const story = en ? (sale.breeder.storyEn ?? sale.breeder.storyRo) : sale.breeder.storyRo;
  const results = en ? (sale.breeder.resultsEn ?? sale.breeder.resultsRo) : sale.breeder.resultsRo;
  const place = [sale.breeder.city, sale.breeder.country].filter(Boolean).join(", ");

  const all = sale.lots.flatMap((l) => l.auctions);
  const cuOferte = all.filter((a) => a._count.bids > 0);
  const media =
    cuOferte.length > 0
      ? Math.round(cuOferte.reduce((s, a) => s + a.currentPriceCents, 0) / cuOferte.length)
      : null;
  const period = salePeriod(sale.lots);
  const status = saleStatus(sale.lots);

  const dateFmt = new Intl.DateTimeFormat(intlLocale(currentLocale), {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Bucharest",
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* ── Prezentarea ── */}
      {sale.coverUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={sale.coverUrl}
          alt={title}
          data-testid="sale-cover"
          className="mb-6 aspect-[16/6] w-full rounded-2xl border border-ink/10 object-cover"
        />
      )}

      <p className="text-sm font-bold uppercase tracking-wide text-wing-blue">
        {t("breederAuction")}
      </p>
      <h1 className="font-display mt-1 text-3xl font-bold sm:text-4xl" data-testid="sale-page-title">
        {title}
      </h1>
      <p className="mt-1 text-ink/60" data-testid="sale-breeder">
        {sale.breeder.name}
        {place ? ` · ${place}` : ""}
      </p>

      <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4" data-testid="sale-stats">
        <Stat label={t("pigeons")} value={String(all.length)} />
        <Stat label={t("lots")} value={String(sale.lots.length)} />
        <Stat
          label={t("average")}
          value={
            media !== null
              ? `${formatMoney(media, settings.platformCurrency, currentLocale)}${
                  eurRate
                    ? ` (${equivalentLabel(media, settings.platformCurrency, currentLocale, eurRate)})`
                    : ""
                }`
              : "—"
          }
          testid="sale-average"
        />
        {period && (
          <Stat
            label={status === "CLOSED" ? t("endedAt") : t("endsAtLabel")}
            value={dateFmt.format(period.endsAt)}
          />
        )}
      </dl>

      {desc && (
        <div className="mt-6 max-w-3xl" data-testid="sale-description">
          <RichText text={desc} />
        </div>
      )}

      {(story || results || sale.breeder.photoUrl) && (
        <details className="mt-6 overflow-hidden rounded-2xl border border-ink/10 bg-white" data-testid="sale-breeder-info">
          <summary className="cursor-pointer px-5 py-4 font-display text-lg font-bold">
            {t("aboutBreeder", { name: sale.breeder.name })}
          </summary>
          <div className="grid gap-5 border-t border-ink/10 p-5 sm:grid-cols-[180px_1fr]">
            {sale.breeder.photoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={sale.breeder.photoUrl}
                alt={sale.breeder.name}
                className="aspect-square w-full rounded-xl object-cover"
              />
            )}
            <div className="space-y-5">
              {story && <RichText text={story} />}
              {results && (
                <div>
                  <h3 className="font-display mb-2 text-lg font-bold">{t("results")}</h3>
                  <RichText text={results} />
                </div>
              )}
            </div>
          </div>
        </details>
      )}

      {/* ── Loturile ── */}
      <section className="mt-10" data-testid="sale-lots">
        <ViewToggle labels={{ grid: t("viewGrid"), list: t("viewList") }}>
          <div className="space-y-5">
            {sale.lots.map((lot) => {
              const open = lot.status !== "CLOSED";
              return (
                <details
                  key={lot.id}
                  open={open}
                  className="overflow-hidden rounded-2xl border border-ink/10 bg-white"
                  data-testid="sale-lot"
                  id={`lot-${lot.number}`}
                >
                  <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 px-5 py-4">
                    <span className="flex flex-wrap items-center gap-3">
                      <span className="font-display text-2xl font-bold">
                        {t("lotTitle", { number: lot.number })}
                      </span>
                      <span className="text-sm text-ink/60">
                        {t("pigeonsCount", { count: lot.auctions.length })}
                      </span>
                      <LotBadge status={lot.status} label={t(`lotStatus${lot.status}` as "lotStatusLIVE")} />
                    </span>
                    <span className="text-end text-sm">
                      {lot.status === "SCHEDULED" ? (
                        <>
                          <span className="block text-xs uppercase tracking-wide text-ink/50">
                            {t("startsAtLabel")} {dateFmt.format(lot.startsAt)}
                          </span>
                          <Countdown target={lot.startsAt.toISOString()} compact />
                        </>
                      ) : lot.status === "LIVE" ? (
                        <>
                          <span className="block text-xs uppercase tracking-wide text-ink/50">
                            {t("endsAtLabel")} {dateFmt.format(lot.endsAt)}
                          </span>
                          <Countdown target={lot.endsAt.toISOString()} compact />
                        </>
                      ) : (
                        <span className="text-ink/60">
                          {t("endedAt")} {dateFmt.format(lot.endsAt)}
                        </span>
                      )}
                    </span>
                  </summary>

                  <div className="border-t border-ink/10 p-5">
                    {/* grila */}
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 group-data-[view=list]:hidden">
                      {lot.auctions.map((a) => (
                        <AuctionCard key={a.id} auction={toCardData(a)} />
                      ))}
                    </div>

                    {/* lista */}
                    <ul className="hidden divide-y divide-ink/5 group-data-[view=list]:block">
                      {lot.auctions.map((a) => {
                        const price = a._count.bids > 0 ? a.currentPriceCents : a.startPriceCents;
                        return (
                          <li key={a.id} data-testid="sale-list-row">
                            <Link
                              href={`/auctions/${a.id}`}
                              className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 hover:bg-ivory-soft"
                            >
                              <span className="font-display w-14 font-bold">
                                {lotLabel(lot.number, a.lotPosition ?? 0)}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block font-semibold">{a.pigeon.name}</span>
                                <span className="block text-xs text-ink/50">
                                  {a.pigeon.ringNumber}
                                </span>
                              </span>
                              <span className="text-end">
                                <span className="block font-bold text-wing-orange">
                                  {formatMoney(price, a.currency, currentLocale)}
                                </span>
                                {eurRate && (
                                  <span className="mt-0.5 ms-auto block w-fit text-xs inline-block rounded-full bg-wing-blue px-2.5 py-0.5 font-bold text-white" data-testid="price-equiv">
                                    {equivalentLabel(price, a.currency, currentLocale, eurRate)}
                                  </span>
                                )}
                                <span className="block text-xs text-ink/50">
                                  {ta("bidsCount", { count: a._count.bids })}
                                </span>
                              </span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </details>
              );
            })}
          </div>
        </ViewToggle>
      </section>
    </div>
  );
}

function Stat({ label, value, testid }: { label: string; value: string; testid?: string }) {
  return (
    <div className="rounded-xl border border-ink/10 bg-white px-4 py-3" data-testid={testid}>
      <dt className="text-xs uppercase tracking-wide text-ink/50">{label}</dt>
      <dd className="font-display mt-0.5 text-lg font-bold">{value}</dd>
    </div>
  );
}

function LotBadge({ status, label }: { status: string; label: string }) {
  const cls =
    status === "LIVE"
      ? "bg-wing-red text-white"
      : status === "SCHEDULED"
        ? "bg-wing-blue text-white"
        : "bg-ink/10 text-ink/70";
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${cls}`} data-testid="sale-lot-status">
      {label}
    </span>
  );
}
