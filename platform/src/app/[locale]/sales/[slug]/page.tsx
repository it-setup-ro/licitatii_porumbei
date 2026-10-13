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
import CountdownBoxes from "@/components/CountdownBoxes";
import { parseBreederResults } from "@/lib/breeder-results";
import RichText from "@/components/RichText";
import ExpandableText from "@/components/ExpandableText";
import ViewToggle from "@/components/ViewToggle";
import { intlLocale, pick } from "@/lib/locales";
import { platformFormat } from "@/lib/platform-time";

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
          include: { auctions: { where: { hiddenAt: null }, orderBy: { lotPosition: "asc" }, include: cardInclude } },
        },
      },
    }),
    getSettings(),
  ]);
  if (!sale || sale.lots.length === 0) notFound();
  // licitație arhivată: pentru vizitatori nu există
  if (sale.archivedAt) notFound();
  const eurRate = await getEurRate();

  // Articolele despre crescător, alese de administrator la scrierea lor.
  const breederArticles = await prisma.article.findMany({
    where: { breederId: sale.breederId, publishedAt: { not: null, lte: new Date() } },
    orderBy: { publishedAt: "desc" },
    take: 12,
    select: { id: true, slug: true, titleRo: true, titleEn: true, coverUrl: true, publishedAt: true },
  });
  const articleDate = platformFormat(intlLocale(currentLocale), { dateStyle: "medium" });

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

  // „Loc 1 | Maraton – Berlin | 2025" → trei coloane, ca în machetă
  const rezultate = parseBreederResults(results);

  // o singură imagine de fundal, pusă din Setări, pentru toate licitațiile
  const fundal = settings.saleHeroUrl || null;

  const dateFmt = platformFormat(intlLocale(currentLocale), {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Bucharest",
  });

  return (
    <div>
      {/* ── Capul paginii, după macheta clientului: fundal, crescătorul, cifrele ── */}
      <header className="relative overflow-hidden" data-testid="sale-hero">
        {fundal ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={fundal} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="wing-gradient absolute inset-0" aria-hidden="true" />
        )}
        <div
          className="absolute inset-0 bg-gradient-to-r from-ink/85 via-ink/55 to-ink/15"
          aria-hidden="true"
        />

        <div className="relative mx-auto max-w-6xl px-4 py-10 text-white sm:py-14">
          <div className="flex flex-wrap items-center gap-5">
            {sale.breeder.photoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={sale.breeder.photoUrl}
                alt={sale.breeder.name}
                data-testid="sale-hero-photo"
                className="h-24 w-24 shrink-0 rounded-2xl border-2 border-white/60 object-cover shadow-lg sm:h-32 sm:w-32"
              />
            )}
            <div className="min-w-0">
              {status === "LIVE" && (
                <span
                  className="inline-flex items-center gap-2 rounded-full bg-wing-red px-3 py-1 text-xs font-bold uppercase tracking-wider"
                  data-testid="sale-live-badge"
                >
                  <span className="live-dot h-2 w-2 rounded-full bg-white" aria-hidden="true" />
                  {ta("liveAuction")}
                </span>
              )}
              <p className="mt-2 text-sm font-bold uppercase tracking-wide text-wing-yellow">
                {t("breederAuction")}
              </p>
              <h1 className="font-display text-3xl font-bold leading-tight sm:text-5xl" data-testid="sale-page-title">
                {sale.breeder.name}
              </h1>
              <p className="mt-1 text-white/80" data-testid="sale-breeder">
                {title}
                {place ? ` · ${place}` : ""}
              </p>
            </div>
          </div>

          <dl className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3" data-testid="sale-stats">
            <HeroStat label={t("pigeons")} value={String(all.length)} />
            <HeroStat label={t("lots")} value={String(sale.lots.length)} />
            <HeroStat
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
          </dl>

          {period && (
            <div className="mt-5 flex flex-wrap items-center gap-4" data-testid="sale-hero-time">
              <span className="text-xs font-bold uppercase tracking-wide text-white/70">
                {status === "CLOSED" ? t("endedAt") : t("endsAtLabel")} {dateFmt.format(period.endsAt)}
              </span>
              {status !== "CLOSED" && (
                <CountdownBoxes
                  target={(status === "UPCOMING" ? period.startsAt : period.endsAt).toISOString()}
                  labels={{
                    days: ta("boxDays"),
                    hours: ta("boxHours"),
                    minutes: ta("boxMinutes"),
                    seconds: ta("boxSeconds"),
                  }}
                  zeroLabel={status === "UPCOMING" ? ta("startingNow") : ta("closingNow")}
                />
              )}
            </div>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8">

      {desc && (
        <div className="mt-6 max-w-3xl" data-testid="sale-description">
          <RichText text={desc} />
        </div>
      )}

      {/* ── Despre crescător, pe scurt (macheta clientului) ── */}
      {(story || rezultate.length > 0) && (
        <section className="grid gap-6 lg:grid-cols-[1fr_22rem]" data-testid="sale-breeder-info">
          {story && (
            <div>
              <h2 className="font-display text-2xl font-bold">{t("aboutBreederShort")}</h2>
              <p className="mt-2 font-semibold">{sale.breeder.name}</p>
              <div className="mt-2 text-ink/80">
                <ExpandableText
                  moreLabel={t("readFullStory")}
                  lessLabel={t("readLess")}
                  testid="breeder-story"
                  buttonClassName="mt-3 inline-block rounded-xl bg-wing-orange px-5 py-2.5 font-display text-sm font-bold uppercase tracking-wide text-white hover:bg-wing-red"
                >
                  <RichText text={story} />
                </ExpandableText>
              </div>
            </div>
          )}

          {rezultate.length > 0 && (
            <aside
              className="h-fit rounded-2xl border border-ink/10 bg-white p-5"
              data-testid="breeder-results"
            >
              <h3 className="font-display mb-3 flex items-center gap-2 text-lg font-bold">
                <span aria-hidden="true">🏆</span>
                {t("importantResults")}
              </h3>
              <ul className="space-y-2 text-sm">
                {rezultate.map((r, i) => (
                  <li key={i} className="flex items-baseline gap-2" data-testid="breeder-result-row">
                    <span aria-hidden="true" className="text-wing-orange">
                      🏅
                    </span>
                    {r.place && <span className="font-semibold">{r.place}</span>}
                    <span className="min-w-0 flex-1 text-ink/80">{r.race}</span>
                    {r.year && <span className="text-ink/50">{r.year}</span>}
                  </li>
                ))}
              </ul>
            </aside>
          )}
        </section>
      )}


      {/* ── Loturile ── */}
      <section className="mt-10" data-testid="sale-lots">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-2xl font-bold">{t("lotsInAuction")}</h2>
          <p className="text-sm text-ink/60">{t("lotsCount", { count: sale.lots.length })}</p>
        </div>
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
                      <span className="font-display rounded-xl bg-wing-orange px-3 py-1 text-lg font-bold text-white">
                        {t("lotTitle", { number: lot.number })}
                      </span>
                      <span className="text-sm text-ink/60">
                        {t("pigeonsCount", { count: lot.auctions.length })}
                      </span>
                      {lot.auctions.length > 0 && (
                        <span className="text-sm" data-testid="sale-lot-price">
                          {/* fără nicio ofertă pe lot, suma e prețul de pornire, nu „oferta curentă" */}
                          <span className="text-ink/50">
                            {lot.auctions.some((a) => a._count.bids > 0) ? ta("currentBid") : ta("startPrice")}:{" "}
                          </span>
                          <span className="font-display font-bold text-wing-orange">
                            {formatMoney(
                              lot.auctions.some((a) => a._count.bids > 0)
                                ? Math.max(...lot.auctions.map((a) => a.currentPriceCents))
                                : Math.min(...lot.auctions.map((a) => a.startPriceCents)),
                              // moneda porumbeilor din lot, nu cea a platformei
                              lot.auctions[0].currency,
                              currentLocale
                            )}
                          </span>
                        </span>
                      )}
                      <LotBadge status={lot.status} label={t(`lotStatus${lot.status}` as "lotStatusLIVE")} />
                    </span>
                    <span className="text-end text-sm">
                      {lot.status === "SCHEDULED" ? (
                        <>
                          <span className="block text-xs uppercase tracking-wide text-ink/50">
                            {t("startsAtLabel")} {dateFmt.format(lot.startsAt)}
                          </span>
                          <Countdown
                            target={lot.startsAt.toISOString()}
                            compact
                            zeroLabel={ta("startingNow")}
                            refreshOnZero
                          />
                        </>
                      ) : lot.status === "LIVE" ? (
                        <>
                          <span className="block text-xs uppercase tracking-wide text-ink/50">
                            {t("endsAtLabel")} {dateFmt.format(lot.endsAt)}
                          </span>
                          <Countdown
                            target={lot.endsAt.toISOString()}
                            compact
                            zeroLabel={ta("closingNow")}
                            refreshOnZero
                          />
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

        {/* Articolele lui, cele mai noi întâi */}
        {breederArticles.length > 0 && (
          <div className="mt-6 border-t border-ink/10 pt-5" data-testid="sale-breeder-articles">
            <h3 className="font-display mb-3 text-lg font-bold">{t("breederArticles")}</h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {breederArticles.map((a) => (
                <Link
                  key={a.id}
                  href={`/articles/${a.slug}`}
                  data-testid="breeder-article-card"
                  className="card-hover overflow-hidden rounded-xl border border-ink/10 bg-white"
                >
                  <div className="aspect-square bg-ivory-soft">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={a.coverUrl ?? "/pigeons/p1.svg"}
                      alt={pick(currentLocale, a.titleRo, a.titleEn)}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="p-3">
                    <p className="text-[11px] text-ink/50">
                      {a.publishedAt ? articleDate.format(a.publishedAt) : ""}
                    </p>
                    <p className="font-display line-clamp-2 text-sm font-bold leading-snug">
                      {pick(currentLocale, a.titleRo, a.titleEn)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

/** O cifră din capul paginii, pe fundal închis. */
function HeroStat({ label, value, testid }: { label: string; value: string; testid?: string }) {
  return (
    <div className="rounded-xl bg-ink/45 px-4 py-3 backdrop-blur-sm" data-testid={testid}>
      <dt className="text-xs uppercase tracking-wide text-white/70">{label}</dt>
      <dd className="font-display mt-0.5 text-lg font-bold text-white">{value}</dd>
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
