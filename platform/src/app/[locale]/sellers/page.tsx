import { getTranslations, getLocale, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import StarRating from "@/components/StarRating";
import { pick } from "@/lib/locales";

export const dynamic = "force-dynamic";

/**
 * Crescătorii de pe site.
 *
 * Clientul: „pe site apar cu poze cu curcubeu, iar în administrare sunt cu
 * nume". Pagina citea conturile de vânzător (fluxul vechi, fără poze), nu
 * crescătorii licitațiilor pe loturi — cei pe care îi introduce administratorul
 * și care apar peste tot altundeva. Acum îi arată pe aceia, cu poza lor.
 *
 * Apar doar crescătorii cu licitația pornită, programată sau încheiată: cât
 * timp toate loturile sunt ciornă, licitația nu există pentru vizitatori și
 * cardul ar duce într-o pagină care nu se deschide.
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
  const currentLocale = await getLocale();

  const VIZIBILE = ["LIVE", "SCHEDULED", "CLOSED"];

  const [lots, legacyRows] = await Promise.all([
    prisma.lot.findMany({
      where: { status: { in: VIZIBILE }, sale: { archivedAt: null, breeder: { hiddenAt: null } } },
      orderBy: { endsAt: "asc" },
      select: {
        status: true,
        sale: {
          select: {
            slug: true,
            coverUrl: true,
            breeder: {
              select: {
                id: true,
                name: true,
                city: true,
                country: true,
                photoUrl: true,
                storyRo: true,
                storyEn: true,
              },
            },
          },
        },
        auctions: {
          where: { hiddenAt: null },
          orderBy: { lotPosition: "asc" },
          select: { pigeon: { select: { name: true, media: { where: { type: "IMAGE" }, take: 1 } } } },
        },
      },
    }),
    // fluxul vechi: conturi de vânzător cu licitații individuale pornite
    prisma.auction.groupBy({
      by: ["sellerId"],
      where: { status: "LIVE", lotId: null, saleMode: "AUCTION", hiddenAt: null },
      _count: { _all: true },
    }),
  ]);

  type Card = {
    key: string;
    href: string;
    name: string;
    place: string | null;
    photo: string | null;
    photoAlt: string;
    bio: string | null;
    live: number;
    rating?: { avg: number; count: number };
  };

  // un card pe crescător; linkul duce la licitația lui care se închide prima
  const byBreeder = new Map<string, Card>();
  for (const lot of lots) {
    const b = lot.sale.breeder;
    const firstPhoto = lot.auctions.find((a) => a.pigeon.media.length > 0)?.pigeon;
    const live = lot.status === "LIVE" ? lot.auctions.length : 0;
    const card = byBreeder.get(b.id);
    if (card) {
      card.live += live;
      if (!card.photo && firstPhoto) {
        card.photo = firstPhoto.media[0].url;
        card.photoAlt = firstPhoto.name;
      }
      continue;
    }
    const photo = b.photoUrl ?? lot.sale.coverUrl ?? firstPhoto?.media[0]?.url ?? null;
    byBreeder.set(b.id, {
      key: `breeder-${b.id}`,
      href: `/sales/${lot.sale.slug}`,
      name: b.name,
      place: [b.city, b.country].filter(Boolean).join(", ") || null,
      photo,
      photoAlt: b.photoUrl || lot.sale.coverUrl ? b.name : (firstPhoto?.name ?? ""),
      bio: pick(currentLocale, b.storyRo, b.storyEn),
      live,
    });
  }

  const legacyIds = legacyRows.map((r) => r.sellerId);
  const [legacySellers, legacyPhotos, ratings] = await Promise.all([
    prisma.user.findMany({
      // doar vânzători aprobați: administratorul listează în numele crescătorilor,
      // nu e el însuși crescător — altfel apărea „Daniel Admin" printre ei
      where: {
        id: { in: legacyIds },
        suspendedAt: null,
        sellerStatus: "APPROVED",
        role: { not: "ADMIN" },
      },
      select: { id: true, name: true, sellerCompany: true, sellerCity: true, sellerBio: true },
    }),
    prisma.auction.findMany({
      where: { sellerId: { in: legacyIds }, status: "LIVE", lotId: null },
      orderBy: { createdAt: "desc" },
      select: {
        sellerId: true,
        pigeon: { select: { name: true, media: { where: { type: "IMAGE" }, take: 1 } } },
      },
    }),
    prisma.review.groupBy({
      by: ["sellerId"],
      where: { sellerId: { in: legacyIds }, status: "VISIBLE" },
      _avg: { rating: true },
      _count: { _all: true },
    }),
  ]);

  const legacyCards: Card[] = legacyRows.flatMap((r) => {
    const u = legacySellers.find((s) => s.id === r.sellerId);
    if (!u) return [];
    const withPhoto = legacyPhotos.find((a) => a.sellerId === r.sellerId && a.pigeon.media.length > 0);
    const rating = ratings.find((x) => x.sellerId === r.sellerId);
    return [
      {
        key: `seller-${u.id}`,
        href: `/sellers/${u.id}`,
        name: u.sellerCompany ?? u.name,
        place: u.sellerCity,
        photo: withPhoto?.pigeon.media[0]?.url ?? null,
        photoAlt: withPhoto?.pigeon.name ?? "",
        bio: u.sellerBio,
        live: r._count._all,
        rating:
          rating && rating._count._all > 0
            ? { avg: rating._avg.rating ?? 0, count: rating._count._all }
            : undefined,
      },
    ];
  });

  // întâi cine are porumbei în licitație acum: pe ei îi caută lumea
  const cards = [...byBreeder.values(), ...legacyCards].sort(
    (a, b) => b.live - a.live || a.name.localeCompare(b.name, "ro")
  );

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
              key={b.key}
              href={b.href}
              data-testid="seller-card"
              className="card-hover overflow-hidden rounded-2xl border border-ink/10 bg-white"
            >
              {b.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={b.photo}
                  alt={b.photoAlt}
                  data-testid="seller-card-photo"
                  className="aspect-[4/3] w-full bg-ivory-soft object-contain"
                />
              ) : (
                <div className="wing-gradient aspect-[4/3] w-full opacity-70" aria-hidden="true" />
              )}
              <div className="p-5">
                <p
                  className="font-display text-lg font-bold leading-snug"
                  data-testid="seller-card-name"
                >
                  {b.name}
                </p>
                {b.place && (
                  <p className="mt-1 text-sm text-ink/60" data-testid="seller-card-city">
                    ⌂ {b.place}
                  </p>
                )}
                {b.rating && (
                  <span className="mt-2 flex items-center gap-1.5">
                    <StarRating rating={b.rating.avg} size={16} />
                    <span className="text-sm text-ink/60">
                      {b.rating.avg.toFixed(1)} · {b.rating.count}
                    </span>
                  </span>
                )}
                {b.bio && <p className="mt-2 line-clamp-2 text-sm text-ink/70">{b.bio}</p>}
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
