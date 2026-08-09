import { notFound } from "next/navigation";
import { getTranslations, getLocale, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { getCurrentUser } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import { minimumAcceptableMax } from "@/lib/bidding";
import { Link } from "@/i18n/navigation";
import LiveAuctionPanel from "@/components/LiveAuctionPanel";
import PedigreeTree from "@/components/PedigreeTree";
import StarRating from "@/components/StarRating";
import WatchButton from "@/components/WatchButton";

export const dynamic = "force-dynamic";

export default async function AuctionDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auction");
  const tp = await getTranslations("pigeon");
  const currentLocale = await getLocale();

  const auction = await prisma.auction.findUnique({
    where: { id },
    include: {
      pigeon: {
        include: {
          media: { orderBy: { sortIdx: "asc" } },
          results: { orderBy: [{ year: "desc" }, { place: "asc" }] },
          seller: true,
        },
      },
      bids: { orderBy: { createdAt: "desc" }, take: 20, include: { bidder: true } },
      _count: { select: { bids: true } },
    },
  });
  if (!auction || ["DRAFT", "PENDING_APPROVAL", "REJECTED"].includes(auction.status)) notFound();

  const [settings, user] = await Promise.all([getSettings(), getCurrentUser()]);
  const seller = auction.pigeon.seller;

  const sellerStats = await prisma.review.aggregate({
    where: { sellerId: seller.id, status: "VISIBLE" },
    _avg: { rating: true },
    _count: true,
  });

  const watching = user
    ? (await prisma.watchItem.findUnique({
        where: { userId_auctionId: { userId: user.id, auctionId: id } },
      })) !== null
    : false;

  const leadingBid = auction.bids.find((b) => b.isLeading);
  const title = currentLocale === "en" ? auction.pigeon.titleEn : auction.pigeon.titleRo;
  const desc = currentLocale === "en" ? auction.pigeon.descEn : auction.pigeon.descRo;

  const minNext = minimumAcceptableMax(
    auction.currentPriceCents,
    auction._count.bids > 0,
    auction.startPriceCents,
    settings.increments
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
        {/* Coloana stanga: galerie + detalii */}
        <div className="space-y-8">
          <div>
            <div className="overflow-hidden rounded-2xl border border-ink/10 bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={auction.pigeon.media[0]?.url ?? "/pigeons/p1.svg"}
                alt={title}
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
            {auction.pigeon.media.length > 1 && (
              <div className="mt-3 flex gap-3">
                {auction.pigeon.media.slice(1).map((m) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={m.id}
                    src={m.url}
                    alt={m.title ?? ""}
                    className="h-20 w-28 rounded-lg border border-ink/10 object-cover"
                  />
                ))}
              </div>
            )}
          </div>

          <div>
            <h1 className="font-display text-3xl font-bold" data-testid="lot-title">
              {title}
            </h1>
            {desc && <p className="mt-3 leading-relaxed text-ink/80">{desc}</p>}
          </div>

          {/* Fisa porumbelului */}
          <div className="grid grid-cols-2 gap-4 rounded-2xl border border-ink/10 bg-white p-5 sm:grid-cols-3">
            <Fact label={tp("ring")} value={auction.pigeon.ringNumber} testid="fact-ring" />
            <Fact label={tp("year")} value={String(auction.pigeon.birthYear)} />
            <Fact label={tp("sex")} value={tp(`sex${auction.pigeon.sex}` as "sexM")} />
            {auction.pigeon.color && <Fact label={tp("color")} value={auction.pigeon.color} />}
            {auction.pigeon.strain && <Fact label={tp("strain")} value={auction.pigeon.strain} />}
            <Fact
              label={tp("category")}
              value={tp(`category${auction.pigeon.category}` as "categoryRACING")}
            />
          </div>

          {auction.pigeon.pedigreeJson && (
            <PedigreeTree pedigreeJson={auction.pigeon.pedigreeJson} />
          )}

          {/* Palmares */}
          <div>
            <h2 className="font-display mb-3 text-xl font-bold">{tp("results")}</h2>
            {auction.pigeon.results.length === 0 ? (
              <p className="text-sm text-ink/50">{tp("noResults")}</p>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-ink/10 bg-white">
                <table className="w-full text-sm" data-testid="results-table">
                  <tbody>
                    {auction.pigeon.results.map((r) => (
                      <tr key={r.id} className="border-b border-ink/5 last:border-0">
                        <td className="px-4 py-3 font-semibold">
                          <span className="mr-2 inline-block rounded bg-wing-yellow/30 px-2 py-0.5 font-bold">
                            {tp("resultPlace", { place: r.place })}
                          </span>
                          {r.raceName} {r.year ?? ""}
                        </td>
                        <td className="px-4 py-3 text-right text-ink/60">
                          {r.distanceKm ? `${r.distanceKm} km` : ""}
                          {r.participants ? ` · ${tp("resultOf", { count: r.participants })}` : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Istoricul ofertelor */}
          {auction.bids.length > 0 && (
            <div>
              <h2 className="font-display mb-3 text-xl font-bold">{t("bidHistory")}</h2>
              <div className="overflow-hidden rounded-2xl border border-ink/10 bg-white">
                <table className="w-full text-sm" data-testid="bid-history">
                  <tbody>
                    {auction.bids.map((b) => (
                      <tr key={b.id} className="border-b border-ink/5 last:border-0">
                        <td className="px-4 py-2.5 font-medium">
                          {maskName(b.bidder.name)}
                          {b.isLeading && auction.status === "LIVE" && (
                            <span className="ml-2 rounded bg-wing-blue/10 px-1.5 py-0.5 text-xs font-bold text-wing-blue">
                              ★
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 font-semibold">
                          {formatMoney(b.amountCents, auction.currency, currentLocale)}
                        </td>
                        <td className="px-4 py-2.5 text-right text-ink/50">
                          {new Intl.DateTimeFormat(currentLocale === "ro" ? "ro-RO" : "en-GB", {
                            dateStyle: "short",
                            timeStyle: "short",
                          }).format(b.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Coloana dreapta: panoul de licitare + crescator + garantii */}
        <div className="space-y-5">
          <LiveAuctionPanel
            auctionId={auction.id}
            status={auction.status}
            currency={auction.currency}
            initialPriceCents={auction.currentPriceCents}
            startPriceCents={auction.startPriceCents}
            initialBidCount={auction._count.bids}
            initialEndsAt={auction.endsAt.toISOString()}
            minNextCents={minNext}
            userId={user?.id ?? null}
            userIsSeller={user?.id === auction.sellerId}
            userIsLeading={leadingBid?.bidderId === user?.id}
            winAnimationEnabled={settings.winAnimationEnabled}
            winSoundEnabled={settings.winSoundEnabled}
            snipeMinutes={settings.snipeWindowMinutes}
            extensionMinutes={settings.extensionMinutes}
          />

          {auction.status === "CLOSED" && auction.winnerId && (
            <div
              className="rounded-2xl border border-wing-yellow bg-wing-yellow/10 p-4 text-sm font-semibold"
              data-testid="winner-note"
            >
              🏆 {t("winner")}:{" "}
              {maskName(
                (await prisma.user.findUnique({ where: { id: auction.winnerId } }))?.name ?? "—"
              )}
            </div>
          )}

          {user && auction.status === "LIVE" && (
            <WatchButton auctionId={auction.id} initialWatching={watching} />
          )}

          {/* Crescatorul */}
          <div className="rounded-2xl border border-ink/10 bg-white p-5">
            <p className="text-xs uppercase tracking-wide text-ink/50">{t("seller")}</p>
            <p className="font-display mt-1 text-lg font-bold">{seller.sellerCompany ?? seller.name}</p>
            {sellerStats._count > 0 && (
              <div className="mt-1 flex items-center gap-2 text-sm text-ink/60">
                <StarRating rating={sellerStats._avg.rating ?? 0} />
                <span>
                  {(sellerStats._avg.rating ?? 0).toFixed(1)} · {sellerStats._count}
                </span>
              </div>
            )}
            <Link
              href={`/sellers/${seller.id}`}
              className="mt-3 inline-block text-sm font-semibold text-wing-blue hover:underline"
              data-testid="seller-link"
            >
              {t("viewSellerProfile")} →
            </Link>
          </div>

          {/* Livrare & garantii */}
          <div className="rounded-2xl border border-ink/10 bg-white p-5 text-sm">
            <p className="font-semibold">{t("shipping")}</p>
            <p className="mt-1 text-ink/70">
              {t(`shipping${auction.shippingMode}` as "shippingSELLER")} ·{" "}
              {t(`shippingPayer${auction.shippingPayer}` as "shippingPayerBUYER")}
            </p>
            <p className="mt-4 font-semibold">{t("guarantees")}</p>
            <p className="mt-1 text-ink/70">
              {t("guaranteeText", {
                months: settings.aftersalesInfertileMonths,
                sick: settings.aftersalesSickHours,
                dead: settings.aftersalesDeadHours,
              })}
            </p>
            {auction.dnaSexGuaranteed && (
              <p className="mt-3 inline-block rounded-full bg-wing-blue/10 px-3 py-1 text-xs font-bold text-wing-blue">
                🧬 {t("dnaGuaranteed")}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Fact({ label, value, testid }: { label: string; value: string; testid?: string }) {
  return (
    <div data-testid={testid}>
      <p className="text-xs uppercase tracking-wide text-ink/50">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}

/** Confidentialitate: numele ofertantilor apar mascate public (M. P***) */
function maskName(name: string) {
  const parts = name.split(" ");
  return parts
    .map((p, i) => (i === 0 ? p[0] + "." : p.slice(0, 1) + "***"))
    .join(" ");
}
