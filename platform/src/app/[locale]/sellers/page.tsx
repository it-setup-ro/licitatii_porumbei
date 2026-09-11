import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import StarRating from "@/components/StarRating";

export const dynamic = "force-dynamic";

/**
 * Lista crescatorilor aprobati.
 *
 * Pana acum existau doar profilurile individuale, iar la ele se ajungea doar
 * dintr-un lot. Pagina asta e capatul linkului „Crescatori" din subsol si de
 * pe prima pagina.
 *
 * Poza de pe card e poza unui lot al lui, aflat acum in licitatie — nu o
 * fotografie de crescatorie pusa de noi. Cine n-are loturi active apare fara
 * poza, nu cu poza altcuiva.
 */
export default async function SellersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("sellers");
  const th = await getTranslations("home");

  const breeders = await prisma.user.findMany({
    where: { sellerStatus: "APPROVED", suspendedAt: null },
    select: { id: true, name: true, sellerCompany: true, sellerCity: true, sellerBio: true },
  });
  const ids = breeders.map((b) => b.id);

  const [liveRows, lots, ratings] = await Promise.all([
    prisma.auction.groupBy({
      by: ["sellerId"],
      where: { sellerId: { in: ids }, status: "LIVE" },
      _count: { _all: true },
    }),
    prisma.auction.findMany({
      where: { sellerId: { in: ids }, status: "LIVE" },
      orderBy: { createdAt: "desc" },
      select: {
        sellerId: true,
        pigeon: { select: { name: true, media: { where: { type: "IMAGE" }, take: 1 } } },
      },
    }),
    prisma.review.groupBy({
      by: ["sellerId"],
      where: { sellerId: { in: ids }, status: "VISIBLE" },
      _avg: { rating: true },
      _count: { _all: true },
    }),
  ]);

  const cards = breeders
    .map((b) => ({
      ...b,
      live: liveRows.find((r) => r.sellerId === b.id)?._count._all ?? 0,
      photo: lots.find((a) => a.sellerId === b.id && a.pigeon.media.length > 0)?.pigeon.media[0]
        ?.url,
      rating: ratings.find((r) => r.sellerId === b.id),
    }))
    // intai cine are licitatii acum: pe ei ii cauta lumea
    .sort((a, b) => b.live - a.live || a.name.localeCompare(b.name, "ro"));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-3xl font-bold sm:text-4xl" data-testid="sellers-title">
        {t("title")}
      </h1>
      <p className="mt-2 max-w-2xl text-ink/70">{t("intro")}</p>

      {cards.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-ink/10 bg-white p-8 text-center text-ink/60">
          {t("empty")}
        </p>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((b) => (
            <Link
              key={b.id}
              href={`/sellers/${b.id}`}
              data-testid="seller-card"
              className="card-hover overflow-hidden rounded-2xl border border-ink/10 bg-white"
            >
              {b.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={b.photo} alt="" className="aspect-[4/3] w-full object-cover" />
              ) : (
                <div className="wing-gradient aspect-[4/3] w-full opacity-70" aria-hidden="true" />
              )}
              <div className="p-5">
                <p className="font-display text-lg font-bold leading-snug">
                  {b.sellerCompany ?? b.name}
                </p>
                {b.sellerCity && (
                  <p className="mt-1 text-sm text-ink/60" data-testid="seller-card-city">
                    ⌂ {b.sellerCity}
                  </p>
                )}
                {b.rating && b.rating._count._all > 0 && (
                  <span className="mt-2 flex items-center gap-1.5">
                    <StarRating rating={b.rating._avg.rating ?? 0} size={16} />
                    <span className="text-sm text-ink/60">
                      {(b.rating._avg.rating ?? 0).toFixed(1)} · {b.rating._count._all}
                    </span>
                  </span>
                )}
                {b.sellerBio && (
                  <p className="mt-2 line-clamp-2 text-sm text-ink/70">{b.sellerBio}</p>
                )}
                <p className="mt-3 text-sm font-semibold text-wing-blue">
                  {b.live > 0 ? th("lotsAtAuction", { count: b.live }) : t("noLive")}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
