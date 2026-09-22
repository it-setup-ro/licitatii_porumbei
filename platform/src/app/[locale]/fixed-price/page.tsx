import { equivalentLabel } from "@/lib/fx-math";
import { getEurRate } from "@/lib/fx";
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

  // Întâi cei de vânzare, apoi cei vânduți — fiecare grup cu cei mai noi primii.
  // Ordonarea după stare în bază e alfabetică („CLOSED" < „LIVE") și punea
  // porumbeii vânduți înaintea celor pe care omul îi poate cumpăra.
  const include = { pigeon: { include: { media: { orderBy: { sortIdx: "asc" as const }, take: 1 } } } };
  const [available, sold] = await Promise.all([
    prisma.auction.findMany({
      where: { saleMode: "FIXED", status: "LIVE", hiddenAt: null },
      include,
      orderBy: { createdAt: "desc" },
      take: 60,
    }),
    prisma.auction.findMany({
      where: { saleMode: "FIXED", status: "CLOSED", hiddenAt: null },
      include,
      orderBy: { closedAt: "desc" },
      take: 24,
    }),
  ]);
  const lots = [...available, ...sold];
  const eurRate = await getEurRate();

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
            const title = lot.pigeon.name;
            return (
              <Link
                key={lot.id}
                href={`/auctions/${lot.id}`}
                data-testid="fixed-card"
                className="card-hover block overflow-hidden rounded-2xl border border-ink/10 bg-white"
              >
                <div className="relative aspect-[4/3] bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={lot.pigeon.media[0]?.url ?? "/pigeons/p1.svg"}
                    alt={title}
                    className="h-full w-full object-contain"
                  />
                  <span
                    className={`absolute start-3 top-3 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                      sold ? "bg-ink/70 text-ivory" : "bg-wing-orange text-white"
                    }`}
                  >
                    {sold ? t("sold") : t("title")}
                  </span>
                </div>
                <div className="space-y-2 p-4">
                  <h2 className="font-display text-lg font-bold leading-snug">{title}</h2>
                  <p className="text-xs text-ink/60">
                    {lot.pigeon.ringNumber}
                    {lot.pigeon.strain ? ` · ${lot.pigeon.strain}` : ""}
                  </p>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-ink/50">{t("price")}</p>
                    <p className="text-xl font-bold text-wing-orange">
                      {formatMoney(lot.startPriceCents, lot.currency, currentLocale)}
                    </p>
                    {eurRate && (
                      <p className="mt-1 w-fit text-xs inline-block rounded-full bg-wing-blue px-2.5 py-0.5 font-bold text-white" data-testid="price-equiv">
                        {equivalentLabel(lot.startPriceCents, lot.currency, currentLocale, eurRate)}
                      </p>
                    )}
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
