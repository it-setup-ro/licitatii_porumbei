import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import Countdown from "./Countdown";

/**
 * Cardul unui lot, în lista de licitații.
 *
 * Clientul: „licitația la un crescător e per lot" — Lotul 1 și Lotul 2 ale
 * aceluiași crescător au zile și ore diferite, deci fiecare are cardul lui, cu
 * datele lui. Un singur card pe crescător ar fi arătat o singură oră, greșită
 * pentru celălalt lot.
 */

export type LotCardData = {
  saleSlug: string;
  lotNumber: number;
  saleTitleRo: string;
  saleTitleEn: string;
  breederName: string;
  breederPlace: string | null;
  imageUrl: string | null;
  pigeonCount: number;
  status: "LIVE" | "SCHEDULED" | "CLOSED";
  startsAt: Date;
  endsAt: Date;
};

export default async function LotCard({ lot }: { lot: LotCardData }) {
  const t = await getTranslations("sales");
  const locale = await getLocale();
  const en = locale === "en";
  const saleTitle = en ? lot.saleTitleEn : lot.saleTitleRo;

  const when = new Intl.DateTimeFormat(en ? "en-GB" : "ro-RO", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Bucharest",
  });

  const badge =
    lot.status === "LIVE"
      ? { label: t("lotStatusLIVE"), cls: "bg-wing-red text-white" }
      : lot.status === "SCHEDULED"
        ? { label: t("lotStatusSCHEDULED"), cls: "bg-wing-blue text-white" }
        : { label: t("lotStatusCLOSED"), cls: "bg-ink/70 text-ivory" };

  return (
    <Link
      href={`/sales/${lot.saleSlug}#lot-${lot.lotNumber}`}
      data-testid="lot-card"
      className="card-hover block overflow-hidden rounded-2xl border border-ink/10 bg-white"
    >
      <div className="relative aspect-[16/9] bg-white">
        {lot.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={lot.imageUrl} alt={saleTitle} className="h-full w-full object-contain" />
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
        <h3 className="font-display text-lg font-bold leading-snug">
          {t("lotCardTitle", { breeder: lot.breederName, number: lot.lotNumber })}
        </h3>
        <p className="text-sm text-ink/60">
          {saleTitle}
          {lot.breederPlace ? ` · ${lot.breederPlace}` : ""}
        </p>
        <p className="text-sm text-ink/70">{t("pigeonsCount", { count: lot.pigeonCount })}</p>
        <p className="text-sm font-semibold" data-testid="lot-card-dates">
          {when.format(lot.startsAt)} → {when.format(lot.endsAt)}
        </p>
        {lot.status !== "CLOSED" && (
          <div className="flex items-center justify-between pt-1 text-sm">
            <span className="text-xs uppercase tracking-wide text-ink/50">
              {lot.status === "SCHEDULED" ? t("startsIn") : t("endsIn")}
            </span>
            <Countdown
              target={(lot.status === "SCHEDULED" ? lot.startsAt : lot.endsAt).toISOString()}
              compact
            />
          </div>
        )}
      </div>
    </Link>
  );
}
