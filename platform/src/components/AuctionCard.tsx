import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { formatMoney } from "@/lib/money";
import Countdown from "./Countdown";
import { getEurRate } from "@/lib/fx";
import { equivalentLabel } from "@/lib/fx-math";
import { SEX_SYMBOL } from "@/lib/pigeon";

export type AuctionCardData = {
  id: string;
  status: string;
  currency: string;
  startPriceCents: number;
  currentPriceCents: number;
  startsAt: Date;
  endsAt: Date;
  bidCount: number;
  /** „1.04" — porumbeii din licitațiile pe loturi */
  lotLabel?: string | null;
  pigeon: {
    name: string;
    taglineRo: string | null;
    taglineEn: string | null;
    ringNumber: string;
    sex: string;
    birthYear: number;
    strain: string | null;
    imageUrl: string | null;
  };
};

export default async function AuctionCard({ auction }: { auction: AuctionCardData }) {
  const t = await getTranslations("auction");
  const locale = await getLocale();
  const eurRate = await getEurRate();
  const title = auction.pigeon.name;
  const sexSymbol = SEX_SYMBOL[auction.pigeon.sex] ?? "";
  const tagline = locale === "en" ? auction.pigeon.taglineEn : auction.pigeon.taglineRo;
  const price =
    auction.bidCount > 0 || auction.status === "CLOSED"
      ? auction.currentPriceCents
      : auction.startPriceCents;
  const live = auction.status === "LIVE";

  const badge =
    auction.status === "LIVE"
      ? { label: t("statusLive"), cls: "bg-wing-red text-white" }
      : auction.status === "SCHEDULED"
        ? { label: t("statusScheduled"), cls: "bg-wing-blue text-white" }
        : { label: t("statusClosed"), cls: "bg-ink/70 text-ivory" };

  return (
    <Link
      href={`/auctions/${auction.id}`}
      className="card-hover block overflow-hidden rounded-2xl border border-ink/10 bg-white"
      data-testid="auction-card"
    >
      {/* Poza întreagă, fără colțuri tăiate: clientul pune pe poze palmaresul,
          adresa și steagul chiar la margini, care dispăreau la decupare. */}
      <div className="relative aspect-[4/3] bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={auction.pigeon.imageUrl ?? "/pigeons/p1.svg"}
          alt={title}
          className="h-full w-full object-contain"
          data-testid="card-image"
        />
        <span
          className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${badge.cls}`}
        >
          {badge.label}
        </span>
      </div>
      <div className="space-y-2 p-4">
        {auction.lotLabel && (
          <p
            className="text-xs font-bold uppercase tracking-wide text-wing-blue"
            data-testid="card-lot-label"
          >
            {t("lotLabel", { label: auction.lotLabel })}
          </p>
        )}
        <h3 className="font-display text-lg font-bold leading-snug">{title}</h3>
        {tagline && (
          <p className="line-clamp-2 text-sm font-medium text-wing-orange">{tagline}</p>
        )}
        <p className="text-xs font-semibold text-ink">
          {sexSymbol && (
            <span className="mr-1 font-bold" data-testid="card-sex">
              {sexSymbol}
            </span>
          )}
          {auction.pigeon.ringNumber}
          {auction.pigeon.strain ? ` · ${auction.pigeon.strain}` : ""}
        </p>
        <div className="flex items-end justify-between pt-1">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-ink">
              {auction.status === "CLOSED"
                ? auction.bidCount > 0
                  ? t("soldFor")
                  : t("notSold")
                : auction.bidCount > 0
                  ? t("currentBid")
                  : t("startPrice")}
            </p>
            {(auction.status !== "CLOSED" || auction.bidCount > 0) && (
              <>
                <p className="text-xl font-bold text-wing-orange">
                  {formatMoney(price, auction.currency, locale)}
                </p>
                {eurRate && (
                  <p className="mt-1">
                    <span
                      className="inline-block rounded-full bg-wing-blue px-2.5 py-0.5 text-xs font-bold text-white"
                      data-testid="price-equiv"
                    >
                      {equivalentLabel(price, auction.currency, locale, eurRate)}
                    </span>
                  </p>
                )}
              </>
            )}
          </div>
          {/* „Se închide în" cu roșu — clientul: să sară în ochi cât timp mai e */}
          <div className={`text-right ${live ? "text-wing-red" : "text-ink"}`} data-testid="card-time">
            <p className="text-xs font-bold uppercase tracking-wide">
              {auction.status === "SCHEDULED"
                ? t("startsIn")
                : auction.status === "CLOSED"
                  ? t("endedAt")
                  : t("endsIn")}
            </p>
            {auction.status !== "CLOSED" ? (
              <span className="font-bold">
                <Countdown
                  target={(auction.status === "SCHEDULED"
                    ? auction.startsAt
                    : auction.endsAt
                  ).toISOString()}
                  compact
                />
              </span>
            ) : (
              <span className="text-sm font-semibold">
                {new Intl.DateTimeFormat(locale === "ro" ? "ro-RO" : "en-GB", {
                  dateStyle: "medium",
                }).format(auction.endsAt)}
              </span>
            )}
          </div>
        </div>
        <p className="text-xs font-semibold text-ink">{t("bidsCount", { count: auction.bidCount })}</p>
      </div>
    </Link>
  );
}
