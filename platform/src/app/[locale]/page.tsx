import { getTranslations, getLocale, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { getAuctionsByStatus } from "@/lib/queries";
import { getSaleCards } from "@/lib/sale-cards";
import { latestBids } from "@/lib/latest-bids";
import AuctionCard from "@/components/AuctionCard";
import SaleCard from "@/components/SaleCard";
import LatestBids from "@/components/LatestBids";
import ContestCarousel from "@/components/ContestCarousel";
import AuctionRequestForm from "@/components/AuctionRequestForm";
import { IconFacebook, IconInstagram, IconYouTube } from "@/components/SocialIcons";
import { getSettings } from "@/lib/settings";
import { intlLocale, pick } from "@/lib/locales";
import { platformFormat } from "@/lib/platform-time";

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

  const [live, viitoare, oferte, liveLots, legacyRows, articles, contests, stats] = await Promise.all([
    getAuctionsByStatus("LIVE", 6),
    // Ca pe voiajor.net: ce se licitează acum, ce s-a oferit ultima dată și ce
    // urmează — toate pe prima pagină, fără să caute nimeni.
    getSaleCards("SCHEDULED", 6),
    latestBids(5),
    // Clientul: „să apară toți crescătorii cu licitații active". Crescătorii
    // licitațiilor pe loturi nu au cont — se iau din loturile aflate acum live.
    prisma.lot.findMany({
      where: { status: "LIVE", sale: { archivedAt: null, breeder: { hiddenAt: null } } },
      orderBy: { endsAt: "asc" },
      select: {
        sale: {
          select: {
            slug: true,
            coverUrl: true,
            breeder: { select: { id: true, name: true, city: true, photoUrl: true } },
          },
        },
        auctions: {
          where: { hiddenAt: null },
          orderBy: { lotPosition: "asc" },
          select: {
            pigeon: { select: { name: true, media: { where: { type: "IMAGE" }, take: 1 } } },
          },
        },
      },
    }),
    // licitațiile individuale din fluxul vechi (cont de vânzător, fără lot)
    prisma.auction.groupBy({
      by: ["sellerId"],
      where: { status: "LIVE", lotId: null, saleMode: "AUCTION", hiddenAt: null },
      _count: { _all: true },
    }),
    prisma.article.findMany({
      where: { publishedAt: { not: null } },
      orderBy: { publishedAt: "desc" },
      take: 4,
    }),
    // Clientul: „mai multe concursuri active să se ruleze". Toate cele
    // nepublicate sau încheiate rămân afară; cel ales anume în administrare
    // („Banda pe prima pagină") intră primul în carusel.
    prisma.contest.findMany({
      /*
        Banda ține cât ține concursul: până la „Se încheie la".

        Daniel: „după concurs nu ar mai trebui să fie pe bandă... dacă sunt
        multe concursuri devine dificil să mergi la fiecare să-l oprești. Și
        totuși concursul trebuie să fie anunțat din timp, să știe lumea să se
        înscrie." Deci apare de când e publicat (inclusiv înainte de start, ca
        anunț) și pleacă singură la final. Starea o întreține sweeperul
        (`lib/contests.ts`), iar pagina concursului rămâne publicată.
      */
      // „Încheiat” pus cu mâna scoate și el banda, chiar dacă data de sfârșit n-a venit:
      // pe prod există concursuri marcate încheiate cu sfârșitul în decembrie.
      where: { published: true, endsAt: { gte: new Date() }, status: { not: "FINISHED" } },
      orderBy: [{ featured: "desc" }, { startsAt: "asc" }],
      take: 6,
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

  const legacyIds = legacyRows.map((r) => r.sellerId);
  const [legacySellers, legacyAuctions] = await Promise.all([
    prisma.user.findMany({
      // ca pe pagina Crescători: doar vânzători aprobați, fără contul de admin
      where: {
        id: { in: legacyIds },
        suspendedAt: null,
        sellerStatus: "APPROVED",
        role: { not: "ADMIN" },
      },
      select: { id: true, name: true, sellerCompany: true, sellerCity: true },
    }),
    // Poza de pe card e chiar poza unui porumbel de-al lui, aflat acum in licitatie.
    // Asa nu punem pe prima pagina fotografii de crescatorii care nu exista.
    prisma.auction.findMany({
      where: { sellerId: { in: legacyIds }, status: "LIVE", lotId: null, saleMode: "AUCTION", hiddenAt: null },
      orderBy: { createdAt: "desc" },
      select: {
        sellerId: true,
        pigeon: { select: { name: true, media: { where: { type: "IMAGE" }, take: 1 } } },
      },
    }),
  ]);

  type BreederCard = {
    key: string;
    href: string;
    name: string;
    city: string | null;
    photo: string | null;
    photoAlt: string;
    count: number;
  };
  // Un card pe crescător, chiar dacă are mai multe loturi live. Linkul duce la
  // licitația lui care se închide prima (loturile vin ordonate după final).
  const byBreeder = new Map<string, BreederCard>();
  for (const lot of liveLots) {
    const b = lot.sale.breeder;
    const firstPhoto = lot.auctions.find((a) => a.pigeon.media.length > 0)?.pigeon;
    const card = byBreeder.get(b.id);
    if (card) {
      card.count += lot.auctions.length;
      if (!card.photo && firstPhoto) {
        card.photo = firstPhoto.media[0].url;
        card.photoAlt = firstPhoto.name;
      }
      continue;
    }
    // aceeași ordine ca pe cardul lotului: crescătorul, coperta, apoi un porumbel
    const photo = b.photoUrl ?? lot.sale.coverUrl ?? firstPhoto?.media[0]?.url ?? null;
    byBreeder.set(b.id, {
      key: `breeder-${b.id}`,
      href: `/sales/${lot.sale.slug}`,
      name: b.name,
      city: b.city,
      photo,
      photoAlt: b.photoUrl || lot.sale.coverUrl ? b.name : (firstPhoto?.name ?? ""),
      count: lot.auctions.length,
    });
  }
  const legacyCards: BreederCard[] = legacyRows.flatMap((r) => {
    const u = legacySellers.find((s) => s.id === r.sellerId);
    if (!u) return [];
    const withPhoto = legacyAuctions.find((a) => a.sellerId === r.sellerId && a.pigeon.media.length > 0);
    return [
      {
        key: `seller-${u.id}`,
        href: `/sellers/${u.id}`,
        name: u.sellerCompany ?? u.name,
        city: u.sellerCity,
        photo: withPhoto?.pigeon.media[0]?.url ?? null,
        photoAlt: withPhoto?.pigeon.name ?? "",
        count: r._count._all,
      },
    ];
  });
  const breederCards = [...byBreeder.values(), ...legacyCards].sort((a, b) => b.count - a.count);

  const dateFmt = platformFormat(intlLocale(currentLocale), {
    dateStyle: "medium",
  });

  // Rețelele vin din Setări; cele necompletate nu apar deloc.
  const settings = await getSettings();
  // 0-60% din Setari, adus la fractie; peste 60 nu mai e poza, e perete
  const voal = Math.min(60, Math.max(0, settings.homeHeroDarkness)) / 100;

  const socialLinks = [
    {
      href: settings.facebookUrl,
      label: "Facebook",
      icon: <IconFacebook size={26} />,
      cls: "bg-[#1877f2]",
    },
    {
      href: settings.youtubeUrl,
      label: "YouTube",
      icon: <IconYouTube size={26} />,
      cls: "bg-[#ff0000]",
    },
    {
      href: settings.instagramUrl,
      label: "Instagram",
      icon: <IconInstagram size={26} />,
      // Instagram nu are o culoare, are un degrade — îl punem cum îl știe lumea
      cls: "bg-gradient-to-br from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]",
    },
  ].filter((s) => s.href);

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
          data-testid="hero-bg"
          style={{ backgroundImage: `url(${settings.homeHeroUrl || "/pigeons/hero-client.jpg"})` }}
          aria-hidden="true"
        />
        {/*
          Voalul bleumarin de peste fotografie, reglabil din Setari.

          Clientul: poza pusa de el „este mai inchisa decat poza originala" —
          asa e, voalul o intuneca, dar fara el scrisul alb nu se citeste pe o
          poza luminoasa. Acum alege singur cat de tare: 0 = deloc, 15 =
          implicit. Pe calculator e apasat in stinga, unde cade textul, si se
          stinge spre dreapta, ca sa se vada pasarea.
        */}
        <div
          className="absolute inset-0 -z-10 lg:hidden"
          style={{ backgroundColor: `rgba(16, 36, 63, ${voal})` }}
          data-testid="hero-veil"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 -z-10 hidden lg:block"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(16, 36, 63, ${Math.min(0.85, voal * 2.3).toFixed(3)}), rgba(16, 36, 63, ${(voal * 0.8).toFixed(3)}) 45%, rgba(16, 36, 63, 0))`,
          }}
          aria-hidden="true"
        />

        {/* Clientul: pe calculator „parca totul este mai intins". Pe telefon
            cadrul e inalt (0,7 lat pe inalt) si fotografia intra pe inaltime;
            pe calculator cadrul ramanea la aceeasi inaltime, dar de cinci ori
            mai lat (3,4), asa ca din poza se taia un sfert de sus si de jos,
            iar peisajul se lafaia. La 70% din inaltimea ecranului cadrul are
            aproape forma fotografiei, deci se vede aproape intreaga. */}
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:py-24 lg:min-h-[70vh] lg:content-center lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="max-w-2xl">
            <p className="hero-shadow text-xs font-bold uppercase tracking-[0.25em] text-wing-yellow">
              {t("kicker")}
            </p>
            {/* Clientul: „pe prima pagina, in loc de «Pasiunea uneste oameni!» sa
                scrie «No.1 & Best Racing Pigeons»" — adica numele site-ului, luat
                din Setari, ca sa nu fie scris de doua ori in doua locuri. */}
            <h1
              className="font-display hero-shadow mt-4 text-4xl font-bold leading-[1.05] text-white sm:text-6xl"
              data-testid="hero-title"
            >
              {settings.siteName}
            </h1>
            {/* Deviza scrisa de mana, ca in macheta */}
            <p
              className="font-script hero-shadow mt-3 text-2xl text-wing-yellow sm:text-3xl"
              data-testid="hero-motto"
            >
              {t("motto")}
            </p>
            <p className="hero-shadow mt-4 max-w-xl text-lg leading-relaxed text-white/90">
              {t("heroSubtitle")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/auctions"
                data-testid="hero-cta"
                className="inline-flex min-w-[16rem] items-center justify-center rounded-full bg-wing-orange px-7 py-3.5 font-bold text-white shadow-lg transition-colors hover:bg-wing-red"
              >
                {t("heroCta")} →
              </Link>
              <Link
                href="/about"
                data-testid="hero-about"
                /* aceeasi latime minima ca butonul de langa el: clientul le vrea
                   la fel de mari, iar „Despre noi" e un text scurt */
                className="inline-flex min-w-[16rem] items-center justify-center rounded-full bg-white/95 px-7 py-3.5 font-bold text-ink transition-colors hover:bg-white"
              >
                {t("heroAbout")}
              </Link>
            </div>
          </div>

          <p
            className="hero-shadow hidden text-end text-sm font-semibold uppercase leading-loose tracking-[0.2em] text-white/80 lg:block"
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
      {/* Clientul: „sub poza de fundal este o banda albastru inchis, se doreste o
          banda albastru deschis" si „insignele sa aiba un fond deschis, sa fie mai
          vizibile". Deci banda bleu, iar fiecare insigna pe cartonas alb. */}
      <section className="bg-sky-soft text-ink" data-testid="feature-strip">
        <ul className="mx-auto grid max-w-6xl grid-cols-2 gap-3 px-4 py-8 sm:grid-cols-3 lg:grid-cols-6">
          {[
            [t("featureLive"), t("featureLiveSub"), <IconTrophy key="a" />],
            [t("featurePedigree"), t("featurePedigreeSub"), <IconShield key="b" />],
            [t("featureBreeders"), t("featureBreedersSub"), <IconPeople key="c" />],
            [t("featureShipping"), t("featureShippingSub"), <IconTruck key="d" />],
            [t("featureProducts"), t("featureProductsSub"), <IconCart key="e" />],
            [t("featureCommunity"), t("featureCommunitySub"), <IconHeart key="f" />],
          ].map(([title, sub, icon]) => (
            <li
              key={String(title)}
              className="rounded-2xl bg-white px-2 py-4 text-center shadow-sm ring-1 ring-ink/5"
            >
              <span className="mx-auto mb-2 flex h-9 w-9 items-center justify-center text-wing-blue">
                {icon}
              </span>
              <p className="text-sm font-bold leading-tight">{title}</p>
              <p className="mt-0.5 text-xs text-ink/60">{sub}</p>
            </li>
          ))}
        </ul>
      </section>

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
                      {pick(currentLocale, a.titleRo, a.titleEn)}
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

      {/* ───────────── Concursul apropiat ───────────── */}
      {contests.length > 0 && (
        <ContestCarousel
          locale={currentLocale}
          allLabel={t("viewAll")}
          contests={contests.map((c) => ({
            slug: c.slug,
            title: pick(currentLocale, c.titleRo, c.titleEn),
            destination: c.destination,
            distanceKm: c.distanceKm,
            distanceMaxKm: c.distanceMaxKm,
            countryCode: c.countryCode,
            boardingAt: c.boardingAt,
            boardingPlace: c.boardingPlace,
            releaseAt: c.releaseAt,
            weatherUrl: c.weatherUrl,
            slogan: pick(currentLocale, c.sloganRo, c.sloganEn),
            status: c.status,
          }))}
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
        {/* ───────────── Crescători cu licitații active ───────────── */}
        {breederCards.length > 0 && (
          <section data-testid="breeders-strip">
            {/* Fără „Vezi toți crescătorii": lista aceea are conturile de vânzător,
                nu crescătorii din licitații, iar aici apar oricum toți cei activi. */}
            <h2 className="font-display mb-5 text-2xl font-bold sm:text-3xl">{t("breeders")}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {breederCards.map((b) => (
                <Link
                  key={b.key}
                  href={b.href}
                  data-testid="breeder-card"
                  className="card-hover overflow-hidden rounded-2xl border border-ink/10 bg-white"
                >
                  {b.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={b.photo}
                      alt={b.photoAlt}
                      data-testid="breeder-photo"
                      className="aspect-[4/3] w-full bg-ivory-soft object-contain"
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

        {/* ───────────── Ultimele oferte ───────────── */}
        {oferte.length > 0 && (
          <section data-testid="section-latest-bids">
            <h2 className="font-display mb-5 text-2xl font-bold sm:text-3xl">{t("latestBids")}</h2>
            <LatestBids bids={oferte} />
          </section>
        )}

        {/* ───────────── Licitații viitoare ───────────── */}
        {viitoare.length > 0 && (
          <section data-testid="section-upcoming">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <h2 className="font-display text-2xl font-bold sm:text-3xl">{t("upcoming")}</h2>
              <Link
                href="/auctions?status=SCHEDULED"
                className="font-semibold text-wing-blue hover:underline"
              >
                {t("viewAll")} →
              </Link>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {viitoare.map((v) => (
                <SaleCard key={v.slug} sale={v} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* ───── Vreau să organizez o licitație · Urmărește-ne ───── */}
      <section className="bg-ivory-soft" data-testid="home-cta-strip">
        {/* Clientul, aratind spre ele: „si astea 2 sa fie egale" — erau 1,4 la 1.
            Inaltimea era deja aceeasi; acum si latimea. */}
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-12 lg:grid-cols-2">
          {/* Cardul cerut de client, ca pe voiajor.net: crescătorul lasă datele
              și îl sună administratorul. */}
          <div className="rounded-2xl bg-ink p-6 text-white sm:p-8" data-testid="organize-card">
            <h2 className="font-display text-2xl font-bold sm:text-3xl">{t("organizeTitle")}</h2>
            <p className="mt-2 max-w-xl text-white/80">{t("organizeText", { site: settings.siteName })}</p>
            <div className="mt-5 max-w-md">
              <AuctionRequestForm />
            </div>
          </div>

          <div
            className="rounded-2xl border border-ink/10 bg-white p-6 sm:p-8"
            data-testid="follow-card"
          >
            <h2 className="font-display text-2xl font-bold">{t("followTitle")}</h2>
            <p className="mt-2 text-ink/70">{t("followText")}</p>
            {socialLinks.length > 0 ? (
              // Clientul: „să fie sigle, nu scris" — pătrate cu culoarea rețelei
              <div className="mt-5 flex flex-wrap gap-3">
                {socialLinks.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    title={s.label}
                    data-testid="follow-link"
                    className={`flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-sm transition-transform hover:scale-105 ${s.cls}`}
                  >
                    {s.icon}
                  </a>
                ))}
              </div>
            ) : (
              // fără conturi completate în Setări nu punem pictograme moarte
              <p className="mt-5 text-sm text-ink/50" data-testid="follow-soon">
                {t("followSoon")}
              </p>
            )}
          </div>
        </div>
      </section>


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
