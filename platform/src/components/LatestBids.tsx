import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { formatMoney } from "@/lib/money";
import { intlLocale } from "@/lib/locales";
import { platformFormat } from "@/lib/platform-time";
import type { LatestBid } from "@/lib/latest-bids";

/** „110 lei la 15:31 de ALEX" — ultimele oferte, pe prima pagină. */
export default async function LatestBids({ bids }: { bids: LatestBid[] }) {
  const t = await getTranslations("home");
  const locale = await getLocale();
  const ora = platformFormat(intlLocale(locale), { hour: "2-digit", minute: "2-digit" });

  return (
    <ul className="divide-y divide-ink/10 rounded-2xl border border-ink/10 bg-white" data-testid="latest-bids">
      {bids.map((b, i) => (
        <li key={`${b.auctionId}-${i}`}>
          <Link
            href={`/auctions/${b.auctionId}`}
            className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 p-3 hover:bg-ivory-soft"
            data-testid="latest-bid-row"
          >
            <span className="font-semibold">{b.pigeonName}</span>
            <span className="text-sm text-ink/60">
              {t("latestBidLine", {
                amount: formatMoney(b.amountCents, b.currency, locale),
                time: ora.format(b.at),
                name: b.name,
              })}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
