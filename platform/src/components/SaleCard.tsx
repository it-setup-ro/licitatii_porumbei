import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import Countdown from "./Countdown";
import { intlLocale, pick } from "@/lib/locales";
import { platformFormat } from "@/lib/platform-time";

/**
 * Cardul unei licitații de crescător, pe pagina „Licitații".
 *
 * Clientul: acolo vrea doar intrările spre licitațiile crescătorilor, cu poză —
 * porumbeii se văd abia după ce intri. Loturile aceluiași crescător au ore
 * diferite, de aceea pe card scrie ce se întâmplă prima dată („primul lot"),
 * iar ora fiecărui lot se vede înăuntru.
 */

export type SaleCardData = {
  slug: string;
  titleRo: string;
  titleEn: string;
  breederName: string;
  breederPlace: string | null;
  imageUrl: string | null;
  lotCount: number;
  pigeonCount: number;
  status: "LIVE" | "SCHEDULED" | "CLOSED";
  /** începutul cel mai apropiat, finalul cel mai apropiat sau ultimul final */
  nextAt: Date;
  /** loturile nu se închid la aceeași oră: atunci scriem „primul lot" */
  moreThanOneTime: boolean;
};

export default async function SaleCard({ sale }: { sale: SaleCardData }) {
  const t = await getTranslations("sales");
  const ta = await getTranslations("auction");
  const locale = await getLocale();
  const title = pick(locale, sale.titleRo, sale.titleEn);

  const when = platformFormat(intlLocale(locale), {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  const badge =
    sale.status === "LIVE"
      ? { label: t("statusLIVE"), cls: "bg-wing-red text-white" }
      : sale.status === "SCHEDULED"
        ? { label: t("statusUPCOMING"), cls: "bg-wing-blue text-white" }
        : { label: t("statusCLOSED"), cls: "bg-ink/70 text-ivory" };

  const eticheta =
    sale.status === "SCHEDULED"
      ? sale.moreThanOneTime
        ? t("firstLotStartsIn")
        : t("startsIn")
      : sale.moreThanOneTime
        ? t("firstLotEndsIn")
        : t("endsIn");

  return (
    <Link
      href={`/sales/${sale.slug}`}
      data-testid="sale-card"
      className="card-hover block overflow-hidden rounded-2xl border border-ink/10 bg-white"
    >
      <div className="relative aspect-[16/9] bg-white">
        {sale.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={sale.imageUrl} alt={sale.breederName} className="h-full w-full object-cover" />
        ) : (
          <div className="wing-gradient h-full w-full opacity-70" aria-hidden="true" />
        )}
        <span
          className={`absolute start-3 top-3 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${badge.cls}`}
        >
          {badge.label}
        </span>
      </div>
      <div className="space-y-1.5 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-wing-blue">
          {t("breederAuction")}
        </p>
        <h3 className="font-display text-lg font-bold leading-snug" data-testid="sale-card-title">
          {sale.breederName}
        </h3>
        <p className="text-sm text-ink/60">
          {title}
          {sale.breederPlace ? ` · ${sale.breederPlace}` : ""}
        </p>
        <p className="text-sm text-ink/70" data-testid="sale-card-counts">
          {t("lotsCount", { count: sale.lotCount })} · {t("pigeonsCount", { count: sale.pigeonCount })}
        </p>
        <p className="text-sm font-semibold">{when.format(sale.nextAt)}</p>
        {sale.status !== "CLOSED" && (
          <div className="flex items-center justify-between pt-1 text-sm">
            <span className="text-xs uppercase tracking-wide text-ink/50">{eticheta}</span>
            <Countdown
              target={sale.nextAt.toISOString()}
              compact
              zeroLabel={sale.status === "SCHEDULED" ? ta("startingNow") : ta("closingNow")}
              refreshOnZero
            />
          </div>
        )}
      </div>
    </Link>
  );
}
