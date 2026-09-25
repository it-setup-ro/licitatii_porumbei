import { getTranslations, getLocale, setRequestLocale } from "next-intl/server";
import { redirect, Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { breederOfCurrentUser } from "@/lib/breeder-access";
import { pick, intlLocale } from "@/lib/locales";
import BreederNav from "@/components/BreederNav";

export const dynamic = "force-dynamic";

/**
 * Licitațiile mele — ce a pregătit administratorul pentru crescător: licitația,
 * loturile ei și ora fiecăruia. Crescătorul se uită, nu schimbă: loturile le
 * face și le pornește administratorul.
 */
export default async function BreederAuctionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("breeder");
  const ts = await getTranslations("sales");
  const currentLocale = await getLocale();

  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale });
  const acces = await breederOfCurrentUser();
  if (!acces) redirect({ href: "/account", locale });
  const { breeder } = acces!;

  const sales = await prisma.sale.findMany({
    where: { breederId: breeder.id },
    include: {
      lots: {
        orderBy: { number: "asc" },
        include: { _count: { select: { auctions: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const cand = (d: Date) =>
    new Intl.DateTimeFormat(intlLocale(currentLocale), {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(d);

  const statusLabel = (status: string) =>
    status === "LIVE"
      ? ts("lotStatusLIVE")
      : status === "SCHEDULED"
        ? ts("lotStatusSCHEDULED")
        : status === "CLOSED"
          ? ts("lotStatusCLOSED")
          : t("lotStatusDRAFT");

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="font-display mb-2 text-3xl font-bold">{t("title")}</h1>
      <p className="mb-6 text-sm text-ink/60">{t("intro")}</p>
      <BreederNav active="auctions" />

      {sales.length === 0 ? (
        <p className="mt-10 text-ink/50" data-testid="breeder-no-auctions">
          {t("noAuctions")}
        </p>
      ) : (
        <div className="mt-6 space-y-6" data-testid="breeder-sales-list">
          {sales.map((s) => (
            <section key={s.id} className="rounded-2xl border border-ink/10 bg-white p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-display text-xl font-bold">{pick(currentLocale, s.titleRo, s.titleEn)}</h2>
                {s.archivedAt === null && (
                  <Link
                    href={`/sales/${s.slug}`}
                    className="text-sm font-semibold text-wing-blue hover:underline"
                    data-testid="breeder-sale-link"
                  >
                    {t("viewOnSite")}
                  </Link>
                )}
              </div>
              <p className="mt-1 text-sm text-ink/60">{t("commission", { percent: s.commissionPercent })}</p>

              {s.lots.length === 0 ? (
                <p className="mt-4 text-sm text-ink/50">{t("noLots")}</p>
              ) : (
                <ul className="mt-4 divide-y divide-ink/5 text-sm">
                  {s.lots.map((l) => (
                    <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                      <span className="font-semibold">{ts("lotTitle", { number: l.number })}</span>
                      <span className="text-ink/60">{ts("pigeonsCount", { count: l._count.auctions })}</span>
                      <span className="text-ink/60">
                        {l.status === "CLOSED"
                          ? `${ts("endedAt")}: ${cand(l.endsAt)}`
                          : `${ts("startsAtLabel")}: ${cand(l.startsAt)}`}
                      </span>
                      <span className="rounded-full bg-ink/5 px-3 py-1 text-xs font-bold">
                        {statusLabel(l.status)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
