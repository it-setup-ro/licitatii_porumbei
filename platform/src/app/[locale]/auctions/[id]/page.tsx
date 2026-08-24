import { notFound } from "next/navigation";
import { getTranslations, getLocale, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { getCurrentUser } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import { minimumAcceptableMax } from "@/lib/bidding";
import { Link } from "@/i18n/navigation";
import LiveAuctionPanel from "@/components/LiveAuctionPanel";
import BuyNowPanel from "@/components/BuyNowPanel";
import LotGallery from "@/components/LotGallery";
import BidHistory, { type BidRow } from "@/components/BidHistory";
import PedigreeTree from "@/components/PedigreeTree";
import StarRating from "@/components/StarRating";
import WatchButton from "@/components/WatchButton";

/**
 * Pagina unui lot, in structura de pe pipa.be:
 *
 *   serie inel · nume · rand scurt de descriere
 *   galerie (foto + video)
 *   serie / an / sex · reprodus de · oferit de
 *   descrierea lunga
 *   pedigree
 *   „Toate detaliile" — restul informatiilor, pliate
 *
 * Coloana din dreapta ramane pentru licitat/cumparat, crescator si favorite.
 */

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
      bids: { orderBy: { createdAt: "desc" }, take: 100, include: { bidder: true } },
      _count: { select: { bids: true } },
    },
  });
  if (!auction || ["DRAFT", "PENDING_APPROVAL", "REJECTED"].includes(auction.status)) notFound();

  const [settings, user] = await Promise.all([getSettings(), getCurrentUser()]);
  const pigeon = auction.pigeon;
  const seller = pigeon.seller;

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
  const tagline = currentLocale === "en" ? pigeon.taglineEn : pigeon.taglineRo;
  const desc = currentLocale === "en" ? pigeon.descEn : pigeon.descRo;

  const minNext = minimumAcceptableMax(
    auction.currentPriceCents,
    auction._count.bids > 0,
    auction.startPriceCents,
    settings.increments
  );

  const dateFmt = new Intl.DateTimeFormat(currentLocale === "ro" ? "ro-RO" : "en-GB", {
    dateStyle: "short",
    timeStyle: "short",
  });

  const bidRows: BidRow[] = auction.bids.map((b) => ({
    id: b.id,
    name: maskName(b.bidder.name),
    amount: formatMoney(b.amountCents, auction.currency, currentLocale),
    when: dateFmt.format(b.createdAt),
    leading: b.isLeading,
  }));

  const hasExtras =
    pigeon.color ||
    pigeon.strain ||
    pigeon.results.length > 0 ||
    pigeon.pedigreeJson ||
    auction.dnaSexGuaranteed;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/*
        Pe desktop: doua coloane. Pe telefon totul se aseaza in ordinea din DOM,
        adica identitate → galerie → PRET → restul. Fara plasarea explicita pe
        randuri, panoul de licitat ar ajunge sub descriere si pedigree, adica
        la doua ecrane de derulare distanta de poza.
      */}
      <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
        <div className="space-y-8 lg:col-start-1 lg:row-start-1">
          {/* Serie inel · nume · rand scurt */}
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-ink/50" data-testid="lot-ring">
              {pigeon.ringNumber}
            </p>
            <h1 className="font-display mt-1 text-3xl font-bold" data-testid="lot-title">
              {pigeon.name}
            </h1>
            {tagline && (
              <p className="mt-2 text-lg font-medium text-wing-orange" data-testid="lot-tagline">
                {tagline}
              </p>
            )}
          </div>

          <LotGallery media={pigeon.media} alt={pigeon.name} videoLabel={t("video")} />
        </div>

        {/* Coloana dreapta: licitare/cumparare, crescator, favorite */}
        <div className="space-y-5 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          {auction.saleMode === "FIXED" ? (
            <BuyNowPanel
              auctionId={auction.id}
              priceCents={auction.startPriceCents}
              currency={auction.currency}
              sold={auction.status !== "LIVE"}
              userId={user?.id ?? null}
              userIsSeller={user?.id === auction.sellerId}
            />
          ) : (
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
          )}

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

          {/* Crescatorul (contul de pe platforma) */}
          <div className="rounded-2xl border border-ink/10 bg-white p-5">
            <p className="text-xs uppercase tracking-wide text-ink/50">{t("seller")}</p>
            <p className="font-display mt-1 text-lg font-bold">
              {seller.sellerCompany ?? seller.name}
            </p>
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
        </div>

        <div className="space-y-8 lg:col-start-1 lg:row-start-2">
          {/* Fisa scurta: serie, an, sex, reprodus de, oferit de */}
          <div
            className="grid grid-cols-2 gap-4 rounded-2xl border border-ink/10 bg-white p-5 sm:grid-cols-3"
            data-testid="lot-facts"
          >
            <Fact label={tp("ring")} value={pigeon.ringNumber} testid="fact-ring" />
            <Fact label={tp("year")} value={String(pigeon.birthYear)} testid="fact-year" />
            <Fact label={tp("sex")} value={tp(`sex${pigeon.sex}` as "sexM")} testid="fact-sex" />
            {pigeon.bredBy && (
              <Fact label={tp("bredBy")} value={pigeon.bredBy} testid="fact-bred-by" />
            )}
            {pigeon.offeredBy && (
              <Fact label={tp("offeredBy")} value={pigeon.offeredBy} testid="fact-offered-by" />
            )}
          </div>

          {/* Descrierea lunga */}
          {desc && (
            <div data-testid="lot-description">
              <h2 className="font-display mb-3 text-xl font-bold">{tp("about")}</h2>
              <p className="whitespace-pre-line leading-relaxed text-ink/80">{desc}</p>
            </div>
          )}

          {/* Pedigree scanat */}
          {pigeon.pedigreeUrl && (
            <PedigreeScan
              url={pigeon.pedigreeUrl}
              title={tp("pedigree")}
              openLabel={tp("openPedigree")}
              alt={`${tp("pedigree")} ${pigeon.name}`}
            />
          )}

          {/* Restul informatiilor, la un buton */}
          {hasExtras && (
            <details
              className="overflow-hidden rounded-2xl border border-ink/10 bg-white"
              data-testid="lot-more"
            >
              <summary className="cursor-pointer px-5 py-4 font-display text-lg font-bold">
                {t("moreDetails")}
              </summary>
              <div className="space-y-6 border-t border-ink/10 p-5">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {pigeon.color && <Fact label={tp("color")} value={pigeon.color} />}
                  {pigeon.strain && <Fact label={tp("strain")} value={pigeon.strain} />}
                  <Fact
                    label={tp("category")}
                    value={tp(`category${pigeon.category}` as "categoryRACING")}
                  />
                </div>

                {pigeon.pedigreeJson && <PedigreeTree pedigreeJson={pigeon.pedigreeJson} />}

                <div>
                  <h3 className="font-display mb-3 text-lg font-bold">{tp("results")}</h3>
                  {pigeon.results.length === 0 ? (
                    <p className="text-sm text-ink/50">{tp("noResults")}</p>
                  ) : (
                    <div className="overflow-hidden rounded-2xl border border-ink/10">
                      <table className="w-full text-sm" data-testid="results-table">
                        <tbody>
                          {pigeon.results.map((r) => (
                            <tr key={r.id} className="border-b border-ink/5 last:border-0">
                              <td className="px-4 py-3 font-semibold">
                                <span className="mr-2 inline-block rounded bg-wing-yellow/30 px-2 py-0.5 font-bold">
                                  {tp("resultPlace", { place: r.place })}
                                </span>
                                {r.raceName} {r.year ?? ""}
                              </td>
                              <td className="px-4 py-3 text-right text-ink/60">
                                {r.distanceKm ? `${r.distanceKm} km` : ""}
                                {r.participants
                                  ? ` · ${tp("resultOf", { count: r.participants })}`
                                  : ""}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="text-sm">
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
            </details>
          )}

          {/* Ofertele: ultimele cateva, restul la buton */}
          {auction.saleMode !== "FIXED" && (
            <div>
              <h2 className="font-display mb-3 text-xl font-bold">{t("bidHistory")}</h2>
              <BidHistory bids={bidRows} live={auction.status === "LIVE"} />
            </div>
          )}
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

/**
 * Scanul pedigree-ului. Pozele se afiseaza direct; PDF-urile se deschid intr-o
 * fila noua (pe telefon, un PDF incorporat in pagina fie nu se randeaza, fie
 * blocheaza derularea) si se incorporeaza doar pe ecrane mari.
 */
function PedigreeScan({
  url,
  title,
  openLabel,
  alt,
}: {
  url: string;
  title: string;
  openLabel: string;
  alt: string;
}) {
  const isPdf = url.toLowerCase().endsWith(".pdf");

  return (
    <div data-testid="lot-pedigree">
      <h2 className="font-display mb-3 text-xl font-bold">{title}</h2>
      {isPdf ? (
        <>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="pedigree-open"
            className="inline-block rounded-xl border border-ink/20 bg-white px-5 py-3 text-sm font-semibold text-wing-blue hover:border-wing-blue"
          >
            📄 {openLabel}
          </a>
          {/* iframe, nu object: CSP-ul are object-src 'none' */}
          <iframe
            src={url}
            title={alt}
            className="mt-3 hidden h-[70vh] w-full rounded-2xl border border-ink/10 sm:block"
          />
        </>
      ) : (
        <a href={url} target="_blank" rel="noopener noreferrer" data-testid="pedigree-open">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={alt}
            className="w-full rounded-2xl border border-ink/10 bg-white"
          />
        </a>
      )}
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
