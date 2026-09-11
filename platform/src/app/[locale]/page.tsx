import { getTranslations, getLocale, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { getAuctionsByStatus } from "@/lib/queries";
import AuctionCard from "@/components/AuctionCard";
import ContestBanner from "@/components/ContestBanner";

export const dynamic = "force-dynamic";

/**
 * Pagina principală, după macheta clientului.
 *
 * Toate cifrele vin din baza de date. În machetă scria „10.000+ crescători
 * activi" și „5.000+ licitații finalizate" — numere de prezentare, care pe o
 * platformă la început ar fi pur și simplu neadevărate. Aici se afișează ce
 * este; când vor fi zece mii, va scrie zece mii.
 */
export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const currentLocale = await getLocale();

  const [live, breederRows, articles, contest, stats] = await Promise.all([
    getAuctionsByStatus("LIVE", 6),
    // crescatorii care au acum loturi in licitatie, cu cate au fiecare
    prisma.auction.groupBy({
      by: ["sellerId"],
      where: { status: "LIVE" },
      _count: { _all: true },
      orderBy: { _count: { sellerId: "desc" } },
      take: 8,
    }),
    prisma.article.findMany({
      where: { publishedAt: { not: null } },
      orderBy: { publishedAt: "desc" },
      take: 4,
    }),
    prisma.contest.findFirst({
      where: { published: true, endsAt: { gte: new Date() } },
      orderBy: { startsAt: "asc" },
    }),
    (async () => {
      const [breeders, closed, running, lots] = await Promise.all([
        prisma.user.count({ where: { sellerStatus: "APPROVED" } }),
        prisma.auction.count({ where: { status: "CLOSED" } }),
        prisma.auction.count({ where: { status: "LIVE" } }),
        prisma.pigeon.count(),
      ]);
      return { breeders, closed, running, lots };
    })(),
  ]);

  const breederIds = breederRows.map((r) => r.sellerId);
  const [breeders, breederLots] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: breederIds } },
      select: { id: true, name: true, sellerCompany: true, sellerCity: true },
    }),
    // Poza de pe card e chiar poza unui lot de-al lui, aflat acum in licitatie.
    // Asa nu punem pe prima pagina fotografii de crescatorii care nu exista.
    prisma.auction.findMany({
      where: { sellerId: { in: breederIds }, status: "LIVE" },
      orderBy: { createdAt: "desc" },
      select: {
        sellerId: true,
        pigeon: { select: { name: true, media: { where: { type: "IMAGE" }, take: 1 } } },
      },
    }),
  ]);

  type BreederCard = {
    id: string;
    name: string;
    city: string | null;
    photo: string | null;
    photoAlt: string;
    count: number;
  };
  const breederCards: BreederCard[] = breederRows.flatMap((r) => {
    const u = breeders.find((b) => b.id === r.sellerId);
    if (!u) return [];
    const lot = breederLots.find((a) => a.sellerId === r.sellerId && a.pigeon.media.length > 0);
    return [
      {
        id: u.id,
        name: u.sellerCompany ?? u.name,
        city: u.sellerCity,
        photo: lot?.pigeon.media[0]?.url ?? null,
        photoAlt: lot?.pigeon.name ?? "",
        count: r._count._all,
      },
    ];
  });

  const dateFmt = new Intl.DateTimeFormat(currentLocale === "ro" ? "ro-RO" : "en-GB", {
    dateStyle: "medium",
  });

  return (
    <div>
      {/* ───────────────── Hero ───────────────── */}
      <section className="relative isolate overflow-hidden" data-testid="hero">
        {/* Fotografia trimisa de client (pics/hero_no1pigeon.png). Pasarea e in
            dreapta, iar stanga e vale si cer — exact unde cade textul. De aceea
            voalul bleumarin e apasat doar in stanga si se stinge spre dreapta.
            Pe telefon textul trece peste tot cadrul, deci acolo voalul e uniform. */}
        <div
          className="absolute inset-0 -z-10 bg-cover bg-center"
          style={{ backgroundImage: "url(/pigeons/hero-client.jpg)" }}
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 -z-10 bg-ink/65 lg:bg-gradient-to-r lg:from-ink lg:via-ink/65 lg:to-transparent"
          aria-hidden="true"
        />

        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:py-24 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-wing-yellow">
              {t("kicker")}
            </p>
            <h1 className="font-display mt-4 text-4xl font-bold leading-[1.05] text-white sm:text-6xl">
              {t("heroTitle")}
            </h1>
            {/* Deviza scrisa de mana, ca in macheta */}
            <p className="font-script mt-3 text-2xl text-wing-yellow sm:text-3xl" data-testid="hero-motto">
              {t("motto")}
            </p>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-white/80">
              {t("heroSubtitle")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/auctions"
                data-testid="hero-cta"
                className="rounded-full bg-wing-orange px-7 py-3.5 font-bold text-white shadow-lg transition-colors hover:bg-wing-red"
              >
                {t("heroCta")} →
              </Link>
              <Link
                href="/about"
                data-testid="hero-about"
                className="rounded-full bg-white/95 px-7 py-3.5 font-bold text-ink transition-colors hover:bg-white"
              >
                {t("heroAbout")}
              </Link>
            </div>
          </div>

          <p
            className="hidden text-right text-sm font-semibold uppercase leading-loose tracking-[0.2em] text-white/70 lg:block"
            data-testid="hero-keywords"
          >
            {t("keywords")
              .split("·")
              .map((k) => (
                <span key={k} className="block">
                  {k.trim()}
                </span>
              ))}
          </p>
        </div>
      </section>

      {/* ───────────── Ce oferă platforma ───────────── */}
      <section className="bg-ink text-white" data-testid="feature-strip">
        <ul className="mx-auto grid max-w-6xl grid-cols-2 gap-y-6 px-4 py-8 sm:grid-cols-3 lg:grid-cols-6">
          {[
            [t("featureLive"), t("featureLiveSub"), <IconTrophy key="a" />],
            [t("featurePedigree"), t("featurePedigreeSub"), <IconShield key="b" />],
            [t("featureBreeders"), t("featureBreedersSub"), <IconPeople key="c" />],
            [t("featureShipping"), t("featureShippingSub"), <IconTruck key="d" />],
            [t("featureProducts"), t("featureProductsSub"), <IconCart key="e" />],
            [t("featureCommunity"), t("featureCommunitySub"), <IconHeart key="f" />],
          ].map(([title, sub, icon]) => (
            <li key={String(title)} className="px-2 text-center">
              <span className="mx-auto mb-2 flex h-9 w-9 items-center justify-center text-wing-yellow">
                {icon}
              </span>
              <p className="text-sm font-bold leading-tight">{title}</p>
              <p className="mt-0.5 text-xs text-white/60">{sub}</p>
            </li>
          ))}
        </ul>
      </section>

      <div className="mx-auto max-w-6xl space-y-16 px-4 py-14">
        {/* ───────────── Crescători cu licitații active ───────────── */}
        {breederCards.length > 0 && (
          <section data-testid="breeders-strip">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <h2 className="font-display text-2xl font-bold sm:text-3xl">{t("breeders")}</h2>
              <Link
                href="/sellers"
                className="font-semibold text-wing-blue hover:underline"
                data-testid="breeders-all"
              >
                {t("breedersAll")} →
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {breederCards.slice(0, 4).map((b) => (
                <Link
                  key={b.id}
                  href={`/sellers/${b.id}`}
                  data-testid="breeder-card"
                  className="card-hover overflow-hidden rounded-2xl border border-ink/10 bg-white"
                >
                  {b.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={b.photo}
                      alt={b.photoAlt}
                      data-testid="breeder-photo"
                      className="aspect-[4/3] w-full object-cover"
                    />
                  ) : (
                    <div className="wing-gradient aspect-[4/3] w-full opacity-70" aria-hidden="true" />
                  )}
                  <div className="p-5">
                    <p className="font-display text-lg font-bold leading-snug">{b.name}</p>
                    {b.city && (
                      <p className="mt-1 text-sm text-ink/60" data-testid="breeder-city">
                        ⌂ {b.city}
                      </p>
                    )}
                    <p className="mt-1 text-sm font-semibold text-wing-blue">
                      {t("lotsAtAuction", { count: b.count })}
                    </p>
                    <span className="mt-4 inline-block rounded-xl border border-ink/15 px-4 py-2 text-sm font-semibold text-wing-blue">
                      {t("seeLots")} →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ───────────── Licitații live ───────────── */}
        <section data-testid="section-live">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-display text-2xl font-bold sm:text-3xl">{t("current")}</h2>
            <Link href="/auctions" className="font-semibold text-wing-blue hover:underline">
              {t("viewAll")} →
            </Link>
          </div>
          {live.length === 0 ? (
            <p className="text-ink/50">{t("noAuctions")}</p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {live.map((a) => (
                <AuctionCard key={a.id} auction={a} />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ───────────── Concursul apropiat ───────────── */}
      {contest && (
        <ContestBanner
          locale={currentLocale}
          contest={{
            slug: contest.slug,
            title: currentLocale === "en" ? contest.titleEn : contest.titleRo,
            destination: contest.destination,
            distanceKm: contest.distanceKm,
            countryCode: contest.countryCode,
            boardingAt: contest.boardingAt,
            boardingPlace: contest.boardingPlace,
            releaseAt: contest.releaseAt,
            weatherUrl: contest.weatherUrl,
            slogan: currentLocale === "en" ? contest.sloganEn : contest.sloganRo,
            status: contest.status,
          }}
          labels={{
            boarding: t("boarding"),
            release: t("release"),
            weather: t("weather"),
            weatherSub: t("weatherSub"),
            firstHome: t("firstHome"),
            soon: t("soon"),
            results: t("contestPage"),
            cta: t("contestPage"),
            at: t("atHour"),
          }}
        />
      )}

      <div className="mx-auto max-w-6xl space-y-16 px-4 py-14">
        {/* ───────────── Articole ───────────── */}
        {articles.length > 0 && (
          <section data-testid="home-articles">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <h2 className="font-display text-2xl font-bold sm:text-3xl">{t("articles")}</h2>
              <Link
                href="/articles"
                className="font-semibold text-wing-blue hover:underline"
                data-testid="articles-all"
              >
                {t("articlesAll")} →
              </Link>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {articles.map((a) => (
                <Link
                  key={a.id}
                  href={`/articles/${a.slug}`}
                  data-testid="home-article-card"
                  className="card-hover overflow-hidden rounded-2xl border border-ink/10 bg-white"
                >
                  <div className="aspect-[16/10] bg-ivory-soft">
                    {a.coverUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={a.coverUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-ink/50">
                      {a.publishedAt ? dateFmt.format(a.publishedAt) : ""}
                    </p>
                    <p className="font-display mt-1 line-clamp-2 font-bold leading-snug">
                      {currentLocale === "en" ? a.titleEn : a.titleRo}
                    </p>
                    <span className="mt-3 inline-block text-sm font-semibold text-wing-blue">
                      {t("readMore")} →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* ───────────── Cifrele platformei ───────────── */}
      <section className="border-y border-ink/10 bg-white" data-testid="home-stats">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-ink/40">
            {t("statsTitle")}
          </p>
          <p className="mb-6 text-sm text-ink/55">{t("statsHint")}</p>
          <dl className="grid grid-cols-2 gap-6 lg:grid-cols-4">
            {[
              [stats.breeders, t("statBreeders")],
              [stats.closed, t("statClosed")],
              [stats.running, t("statLive")],
              [stats.lots, t("statLots")],
            ].map(([value, label]) => (
              <div key={String(label)}>
                <dt className="font-display text-3xl font-bold text-wing-blue sm:text-4xl">
                  {value}
                </dt>
                <dd className="mt-1 text-sm text-ink/60">{label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </div>
  );
}

/* ── pictograme, aceeași grosime de linie ca în restul site-ului ── */

const ico = {
  width: 26,
  height: 26,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function IconTrophy() {
  return (
    <svg {...ico}>
      <path d="M7 4h10v5a5 5 0 0 1-10 0z" />
      <path d="M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3" />
      <path d="M12 14v4M9 21h6" />
    </svg>
  );
}
function IconShield() {
  return (
    <svg {...ico}>
      <path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
function IconPeople() {
  return (
    <svg {...ico}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.9" />
    </svg>
  );
}
function IconTruck() {
  return (
    <svg {...ico}>
      <path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z" />
      <circle cx="7" cy="18" r="1.6" />
      <circle cx="17" cy="18" r="1.6" />
    </svg>
  );
}
function IconCart() {
  return (
    <svg {...ico}>
      <circle cx="9" cy="20" r="1.5" />
      <circle cx="18" cy="20" r="1.5" />
      <path d="M2 3h2.5l2.4 12.4a2 2 0 0 0 2 1.6h8.3a2 2 0 0 0 2-1.6L21 7H5.6" />
    </svg>
  );
}
function IconHeart() {
  return (
    <svg {...ico}>
      <path d="M12 20s-7-4.4-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.6-7 9-7 9z" />
    </svg>
  );
}
