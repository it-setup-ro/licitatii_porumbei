import UnavailableButton from "@/components/admin/UnavailableButton";
import { getEurRate } from "@/lib/fx";
import { notFound } from "next/navigation";
import { getTranslations, getLocale, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { getCurrentUser } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import { incrementFor, minimumAcceptableMax } from "@/lib/bidding";
import { bidderCountForAuction, reserveState } from "@/lib/auction-service";
import { cardInclude, toCardData } from "@/lib/queries";
import AuctionCard from "@/components/AuctionCard";
import StickyBidBar from "@/components/StickyBidBar";
import { Link } from "@/i18n/navigation";
import LiveAuctionPanel from "@/components/LiveAuctionPanel";
import BuyNowPanel from "@/components/BuyNowPanel";
import LotGallery from "@/components/LotGallery";
import BidHistory, { type BidRow } from "@/components/BidHistory";
import PedigreeTree from "@/components/PedigreeTree";
import { describeTraits, parseTraits } from "@/lib/pigeon-traits";
import { messagesFor } from "@/lib/messages";
import StarRating from "@/components/StarRating";
import ZoomableImage from "@/components/ZoomableImage";
import WatchButton from "@/components/WatchButton";
import { lotLabel } from "@/lib/lots";
import { intlLocale, pick } from "@/lib/locales";
import { maskName } from "@/lib/mask-name";

/**
 * Pagina unui lot, in structura de pe pipa.be:
 *
 *   serie inel · nume · rand scurt de descriere
 *   galerie (foto + video)
 *   pedigree — imediat sub poze, e primul lucru cerut dupa ce vezi porumbelul
 *   serie / an / sex · reprodus de · oferit de
 *   descrierea lunga
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
      lot: { include: { sale: { include: { breeder: true } } } },
      _count: { select: { bids: true } },
    },
  });
  if (!auction || ["DRAFT", "PENDING_APPROVAL", "REJECTED"].includes(auction.status)) notFound();
  // scos de pe site de administrator: pentru vizitatori nu există
  if (auction.hiddenAt) notFound();

  const [settings, user, eurRate] = await Promise.all([
    getSettings(),
    getCurrentUser(),
    getEurRate(),
  ]);
  const pigeon = auction.pigeon;
  const seller = pigeon.seller;
  // Porumbeii din licitațiile pe loturi îi introduce administratorul; vânzătorul
  // pe care îl vede cumpărătorul e crescătorul licitației, nu contul adminului.
  const lotSale = auction.lot?.sale ?? null;
  const breeder = lotSale?.breeder ?? null;
  const lotLabelText =
    auction.lot && auction.lotPosition ? lotLabel(auction.lot.number, auction.lotPosition) : null;

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
  const bidderCount = await bidderCountForAuction(auction.id);
  const stepCents = incrementFor(auction.currentPriceCents, settings.increments);
  const reserve = reserveState(auction.reservePriceCents, auction.currentPriceCents);

  // Porumbei asemanatori: intai de la acelasi crescator, apoi din aceeasi linie.
  const similar = await prisma.auction.findMany({
    where: {
      status: "LIVE",
      hiddenAt: null,
      id: { not: auction.id },
      // din același lot, dacă face parte dintr-unul; altfel de la același vânzător sau linie
      ...(auction.lotId
        ? { lotId: auction.lotId }
        : {
            OR: [
              { sellerId: auction.sellerId },
              ...(pigeon.strain ? [{ pigeon: { strain: pigeon.strain } }] : []),
            ],
          }),
    },
    include: cardInclude,
    orderBy: { endsAt: "asc" },
    take: 3,
  });
  // Numele sub care apare contul care vinde. Cand „Oferit de" spune acelasi
  // lucru, nu-l mai repetam in fisa — ar arata ca doua informatii diferite.
  const sellerLabel = breeder?.name ?? seller.sellerCompany ?? seller.name;
  const tagline = pick(currentLocale, pigeon.taglineRo, pigeon.taglineEn);
  const desc = pick(currentLocale, pigeon.descRo, pigeon.descEn);

  const minNext = minimumAcceptableMax(
    auction.currentPriceCents,
    auction._count.bids > 0,
    auction.startPriceCents,
    settings.increments
  );

  /*
    Cine conduce deja are alt minim: ca sa-si ridice plafonul trebuie sa treaca
    peste PROPRIUL plafon secret, nu peste pretul vizibil. Fara asta, liderului i
    se arata suma pe care ar trebui s-o dea un contracandidat — o trimite si
    primeste „oferta prea mica", fara sa inteleaga de ce.
    E propriul lui plafon, deci nu divulgam nimic.
  */
  const viewerIsLeading = Boolean(user && leadingBid && leadingBid.bidderId === user.id);
  const minNextForViewer =
    viewerIsLeading && leadingBid
      ? leadingBid.maxAmountCents + incrementFor(auction.currentPriceCents, settings.increments)
      : minNext;

  const dateFmt = new Intl.DateTimeFormat(intlLocale(currentLocale), {
    dateStyle: "short",
    timeStyle: "short",
  });

  const bidRows: BidRow[] = auction.bids.map((b) => ({
    id: b.id,
    // Numele public ales de om. Numele real nu apare niciodata aici.
    name: b.bidder.nickname ?? maskName(b.bidder.name),
    amount: formatMoney(b.amountCents, auction.currency, currentLocale),
    when: dateFmt.format(b.createdAt),
    leading: b.isLeading,
    auto: b.auto,
  }));

  // fisa detaliata, in stil pipa: doar randurile completate
  const traitGroups = describeTraits(parseTraits(pigeon.traitsJson), messagesFor(currentLocale).traits);

  const hasExtras =
    pigeon.color ||
    pigeon.strain ||
    pigeon.results.length > 0 ||
    pigeon.pedigreeJson ||
    traitGroups.length > 0 ||
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
            {lotSale && lotLabelText && (
              <nav
                className="mb-2 flex flex-wrap items-center gap-x-2 text-sm"
                data-testid="lot-breadcrumb"
              >
                <Link
                  href={`/sales/${lotSale.slug}`}
                  className="font-semibold text-wing-blue hover:underline"
                >
                  {pick(currentLocale, lotSale.titleRo, lotSale.titleEn)}
                </Link>
                <span aria-hidden="true" className="text-ink/30">
                  ›
                </span>
                <span className="font-display font-bold" data-testid="lot-label">
                  {t("lotLabel", { label: lotLabelText })}
                </span>
              </nav>
            )}
            {/* Identitatea, pe un rand: serie · an · sex. Erau doar in fisa de mai
                jos, iar cine se uita la un lot vrea sa le vada langa nume. */}
            <p
              className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold uppercase tracking-wide text-ink/50"
              data-testid="lot-ring"
            >
              <span>{pigeon.ringNumber}</span>
              <span aria-hidden="true">·</span>
              <span data-testid="lot-sex">{tp(`sex${pigeon.sex}` as "sexM")}</span>
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

          <LotGallery
            media={pigeon.media}
            alt={pigeon.name}
            pedigreeUrl={pigeon.pedigreeUrl}
            labels={{
              photos: t("photos"),
              video: t("video"),
              pedigree: tp("pedigree"),
              openPedigree: tp("openPedigree"),
            }}
          />
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
              eurRate={eurRate}
            />
          ) : (
            <LiveAuctionPanel
              auctionId={auction.id}
              status={auction.status}
              currency={auction.currency}
              initialPriceCents={auction.currentPriceCents}
              startPriceCents={auction.startPriceCents}
              initialBidCount={auction._count.bids}
              initialBidderCount={bidderCount}
              initialEndsAt={auction.endsAt.toISOString()}
              minNextCents={minNextForViewer}
              stepCents={stepCents}
              reserve={reserve}
              userId={user?.id ?? null}
              userIsSeller={user?.id === auction.sellerId}
              userIsLeading={leadingBid?.bidderId === user?.id}
              winAnimationEnabled={settings.winAnimationEnabled}
              winSoundEnabled={settings.winSoundEnabled}
              eurRate={eurRate}
              snipeMinutes={auction.lot?.snipeWindowMinutes ?? settings.snipeWindowMinutes}
              extensionMinutes={auction.lot?.extensionMinutes ?? settings.extensionMinutes}
              accountBlocked={
                user &&
                settings.accountApprovalRequired &&
                user.role !== "ADMIN" &&
                user.accountStatus !== "APPROVED"
                  ? user.accountStatus === "REJECTED"
                    ? "REJECTED"
                    : "PENDING"
                  : null
              }
            />
          )}

          {auction.status === "CLOSED" && auction.winnerId && (
            <div
              className="rounded-2xl border border-wing-yellow bg-wing-yellow/10 p-4 text-sm font-semibold"
              data-testid="winner-note"
            >
              🏆 {t("winner")}:{" "}
              {await (async () => {
                const w = await prisma.user.findUnique({ where: { id: auction.winnerId! } });
                return w?.nickname ?? maskName(w?.name ?? "—");
              })()}
            </div>
          )}

          {auction.unavailableAt && (
            <div
              className="rounded-2xl border border-wing-red/30 bg-wing-red/5 p-4 text-sm font-semibold text-wing-red"
              data-testid="pigeon-unavailable"
            >
              {t("unavailableNotice")}
            </div>
          )}

          {user?.role === "ADMIN" &&
            auction.status === "CLOSED" &&
            auction.winnerId &&
            !auction.unavailableAt && <UnavailableButton auctionId={auction.id} />}

          {user && auction.status === "LIVE" && (
            <WatchButton auctionId={auction.id} initialWatching={watching} />
          )}

          {/* Ofertele stau in coloana din dreapta, sub „Adauga la favorite": acolo
              se uita omul cand cantareste daca sa liciteze (cerut de client). */}
          {auction.saleMode !== "FIXED" && (
            <div data-testid="bid-history-box">
              <h2 className="font-display mb-3 text-xl font-bold">{t("bidHistory")}</h2>
              <BidHistory
                bids={bidRows}
                live={auction.status === "LIVE"}
                auctionId={auction.id}
                currency={auction.currency}
              />
            </div>
          )}

          {/* Semne de incredere — discrete, dar chiar langa buton, unde omul
              ezita. Se afiseaza doar ce e adevarat despre lotul asta. */}
          <ul
            className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-2xl border border-ink/10 bg-white p-4 text-xs font-medium text-ink/70"
            data-testid="trust-badges"
          >
            {pigeon.pedigreeUrl && <Trust label={t("trustPedigree")} />}
            <Trust label={t("trustPayment")} />
            <Trust label={t("trustShipping")} />
            {(breeder || seller.sellerStatus === "APPROVED") && <Trust label={t("trustSeller")} />}
          </ul>

          {/* Crescatorul: al licitatiei pe loturi, sau contul care vinde (fluxul vechi) */}
          {breeder && lotSale ? (
            <div className="rounded-2xl border border-ink/10 bg-white p-5" data-testid="breeder-box">
              <p className="text-xs uppercase tracking-wide text-ink/50">{t("seller")}</p>
              <p className="font-display mt-1 text-lg font-bold">{breeder.name}</p>
              {(breeder.city || breeder.country) && (
                <p className="text-sm text-ink/60">
                  ⌂ {[breeder.city, breeder.country].filter(Boolean).join(", ")}
                </p>
              )}
              <Link
                href={`/sales/${lotSale.slug}`}
                className="mt-3 inline-block text-sm font-semibold text-wing-blue hover:underline"
                data-testid="breeder-sale-link"
              >
                {t("allBreederPigeons")} →
              </Link>
            </div>
          ) : (
          <div className="rounded-2xl border border-ink/10 bg-white p-5" data-testid="seller-card">
            <p className="text-xs uppercase tracking-wide text-ink/50">{t("seller")}</p>
            <p className="font-display mt-1 text-lg font-bold">{sellerLabel}</p>
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
          )}
        </div>

        <div className="space-y-8 lg:col-start-1 lg:row-start-2">
          {/* Fisa scurta: serie, an, sex, reprodus de, oferit de */}
          <div
            className="grid grid-cols-2 gap-4 rounded-2xl border border-ink/10 bg-white p-5 sm:grid-cols-3"
            data-testid="lot-facts"
          >
            <Fact label={tp("ring")} value={pigeon.ringNumber} testid="fact-ring" />
            {pigeon.bredBy && (
              <Fact label={tp("bredBy")} value={pigeon.bredBy} testid="fact-bred-by" />
            )}
            {pigeon.offeredBy && pigeon.offeredBy !== sellerLabel && (
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

                {/* Fisa detaliata a porumbelului */}
                {traitGroups.length > 0 && (
                  <div data-testid="lot-traits">
                    <h3 className="font-display mb-3 text-lg font-bold">{tp("traits")}</h3>
                    <div className="space-y-4">
                      {traitGroups.map((g) => (
                        <div key={g.key}>
                          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-ink/40">
                            {g.label}
                          </p>
                          <dl className="overflow-hidden rounded-xl border border-ink/10">
                            {g.rows.map((r) => (
                              <div
                                key={r.key}
                                className="flex justify-between gap-4 border-b border-ink/5 px-4 py-2 text-sm last:border-0 odd:bg-ivory-soft/60"
                                data-testid={`trait-row-${r.key}`}
                              >
                                <dt className="text-ink/60">{r.label}</dt>
                                <dd className="text-end font-semibold">{r.value}</dd>
                              </div>
                            ))}
                          </dl>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

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
                                <span className="me-2 inline-block rounded bg-wing-yellow/30 px-2 py-0.5 font-bold">
                                  {tp("resultPlace", { place: r.place })}
                                </span>
                                {r.raceName} {r.year ?? ""}
                              </td>
                              <td className="px-4 py-3 text-end text-ink/60">
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

          {/* Porumbei asemanatori — de la acelasi crescator sau din aceeasi linie */}
          {similar.length > 0 && (
            <div data-testid="similar-lots">
              <h2 className="font-display mb-1 text-xl font-bold">{t("similar")}</h2>
              <p className="mb-4 text-sm text-ink/60">{t("similarHint")}</p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {similar.map((a) => (
                  <AuctionCard key={a.id} auction={toCardData(a)} />
                ))}
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Pe telefon, butonul de licitat ramane la indemana oricat ai derula. */}
      {auction.saleMode !== "FIXED" && auction.status === "LIVE" && (
        <StickyBidBar
          priceLabel={formatMoney(
            auction._count.bids > 0 ? auction.currentPriceCents : auction.startPriceCents,
            auction.currency,
            currentLocale
          )}
          buttonLabel={t("mobileBidNow")}
          loggedIn={Boolean(user)}
          isSeller={user?.id === auction.sellerId}
          loginHref={`/${locale}/login`}
        />
      )}
    </div>
  );
}

/** Un semn de incredere: bifa + text scurt. */
function Trust({ label }: { label: string }) {
  return (
    <li className="flex items-center gap-1.5">
      <span className="text-wing-blue" aria-hidden="true">
        ✓
      </span>
      {label}
    </li>
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

