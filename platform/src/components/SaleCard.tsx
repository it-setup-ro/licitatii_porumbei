import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import Countdown from "./Countdown";

/**
 * Cardul unei licitații de crescător, în lista de licitații și pe prima pagină.
 */

export type SaleCardData = {
  slug: string;
  titleRo: string;
  titleEn: string;
  imageUrl: string | null;
  breederName: string;
  breederPlace: string | null;
  lotCount: number;
  pigeonCount: number;
  status: "LIVE" | "UPCOMING" | "CLOSED" | "DRAFT";
  /** următorul moment care contează: finalul lotului activ sau începutul celui programat */
  nextAt: Date | null;
};

export default async function SaleCard({ sale }: { sale: SaleCardData }) {
  const t = await getTranslations("sales");
  const locale = await getLocale();
  const title = locale === "en" ? sale.titleEn : sale.titleRo;

  const badge =
    sale.status === "LIVE"
      ? { label: t("statusLIVE"), cls: "bg-wing-red text-white" }
      : sale.status === "UPCOMING"
        ? { label: t("statusUPCOMING"), cls: "bg-wing-blue text-white" }
        : { label: t("statusCLOSED"), cls: "bg-ink/70 text-ivory" };

  return (
    <Link
      href={`/sales/${sale.slug}`}
      data-testid="sale-card"
      className="card-hover block overflow-hidden rounded-2xl border border-ink/10 bg-white"
    >
      <div className="relative aspect-[16/9] bg-ivory-soft">
        {sale.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={sale.imageUrl} alt={title} className="h-full w-full object-cover" />
        ) : (
          <div className="wing-gradient h-full w-full opacity-70" aria-hidden="true" />
        )}
        <span
          className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${badge.cls}`}
        >
          {badge.label}
        </span>
      </div>
      <div className="space-y-1.5 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-wing-blue">{sale.breederName}</p>
        <h3 className="font-display text-lg font-bold leading-snug">{title}</h3>
        {sale.breederPlace && <p className="text-sm text-ink/60">⌂ {sale.breederPlace}</p>}
        <p className="text-sm text-ink/70">
          {t("lotsCount", { count: sale.lotCount })} · {t("pigeonsCount", { count: sale.pigeonCount })}
        </p>
        {sale.nextAt && sale.status !== "CLOSED" && (
          <div className="flex items-center justify-between pt-1 text-sm">
            <span className="text-xs uppercase tracking-wide text-ink/50">
              {sale.status === "UPCOMING" ? t("startsIn") : t("endsIn")}
            </span>
            <Countdown target={sale.nextAt.toISOString()} compact />
          </div>
        )}
      </div>
    </Link>
  );
}
