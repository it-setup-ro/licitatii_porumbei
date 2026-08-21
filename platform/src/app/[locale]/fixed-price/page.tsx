import { getTranslations, getLocale, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { Link } from "@/i18n/navigation";

export const dynamic = "force-dynamic";

export default async function FixedPricePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("fixed");
  const currentLocale = await getLocale();

  const lots = await prisma.auction.findMany({
    where: { saleMode: "FIXED", status: { in: ["LIVE", "CLOSED"] } },
    include: { pigeon: { include: { media: { orderBy: { sortIdx: "asc" }, take: 1 } } } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 60,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-3xl font-bold">{t("title")}</h1>
      <p className="mt-2 text-ink/70">{t("subtitle")}</p>

      {lots.length === 0 ? (
        <p className="mt-10 text-ink/50" data-testid="fixed-empty">
          {t("empty")}
        </p>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {lots.map((lot) => {
            const sold = lot.status === "CLOSED";
            const title = currentLocale === "en" ? lot.pigeon.titleEn : lot.pigeon.titleRo;
            return (
              <Link
                key={lot.id}
                href={`/auctions/${lot.id}`}
                data-testid="fixed-card"
                className="card-hover block overflow-hidden rounded-2xl border border-ink/10 bg-white"
              >
                <div className="relative aspect-[4/3] bg-ivory-soft">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={lot.pigeon.media[0]?.url ?? "/pigeons/p1.svg"}
                    alt={title}
                    className="h-full w-full object-cover"
                  />
                  <span
                    className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                      sold ? "bg-ink/70 text-ivory" : "bg-wing-orange text-white"
                    }`}
                  >
                    {sold ? t("sold") : t("title")}
                  </span>
                </div>
                <div className="space-y-2 p-4">
                  <h2 className="font-display text-lg font-bold leading-snug">{title}</h2>
                  <p className="text-xs text-ink/60">
                    {lot.pigeon.ringNumber} · {lot.pigeon.birthYear}
                    {lot.pigeon.strain ? ` · ${lot.pigeon.strain}` : ""}
                  </p>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-ink/50">{t("price")}</p>
                    <p className="text-xl font-bold text-wing-orange">
                      {formatMoney(lot.startPriceCents, lot.currency, currentLocale)}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
