import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { formatMoney } from "@/lib/money";
import Countdown from "./Countdown";

export type AuctionCardData = {
  id: string;
  status: string;
  currency: string;
  startPriceCents: number;
  currentPriceCents: number;
  startsAt: Date;
  endsAt: Date;
  bidCount: number;
  pigeon: {
    titleRo: string;
    titleEn: string;
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
  const title = locale === "en" ? auction.pigeon.titleEn : auction.pigeon.titleRo;
  const price =
    auction.bidCount > 0 || auction.status === "CLOSED"
      ? auction.currentPriceCents
      : auction.startPriceCents;

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
      <div className="relative aspect-[4/3] bg-ivory-soft">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={auction.pigeon.imageUrl ?? "/pigeons/p1.svg"}
          alt={title}
          className="h-full w-full object-cover"
        />
        <span
          className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${badge.cls}`}
        >
          {badge.label}
        </span>
      </div>
      <div className="space-y-2 p-4">
        <h3 className="font-display text-lg font-bold leading-snug">{title}</h3>
        <p className="text-xs text-ink/60">
          {auction.pigeon.ringNumber} · {auction.pigeon.birthYear}
          {auction.pigeon.strain ? ` · ${auction.pigeon.strain}` : ""}
        </p>
        <div className="flex items-end justify-between pt-1">
          <div>
            <p className="text-xs uppercase tracking-wide text-ink/50">
              {auction.status === "CLOSED"
                ? auction.bidCount > 0
                  ? t("soldFor")
                  : t("notSold")
                : auction.bidCount > 0
                  ? t("currentBid")
                  : t("startPrice")}
            </p>
            {(auction.status !== "CLOSED" || auction.bidCount > 0) && (
              <p className="text-xl font-bold text-wing-orange">
                {formatMoney(price, auction.currency, locale)}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-ink/50">
              {auction.status === "SCHEDULED"
                ? t("startsIn")
                : auction.status === "CLOSED"
                  ? t("endedAt")
                  : t("endsIn")}
            </p>
            {auction.status !== "CLOSED" ? (
              <Countdown
                target={(auction.status === "SCHEDULED"
                  ? auction.startsAt
                  : auction.endsAt
                ).toISOString()}
                compact
              />
            ) : (
              <span className="text-sm text-ink/50">
                {new Intl.DateTimeFormat(locale === "ro" ? "ro-RO" : "en-GB", {
                  dateStyle: "medium",
                }).format(auction.endsAt)}
              </span>
            )}
          </div>
        </div>
        <p className="text-xs text-ink/50">{t("bidsCount", { count: auction.bidCount })}</p>
      </div>
    </Link>
  );
}
