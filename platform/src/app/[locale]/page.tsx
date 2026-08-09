import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getAuctionsByStatus } from "@/lib/queries";
import AuctionCard from "@/components/AuctionCard";
import LogoMark from "@/components/LogoMark";

export const dynamic = "force-dynamic";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");

  const [live, upcoming, closed] = await Promise.all([
    getAuctionsByStatus("LIVE", 6),
    getAuctionsByStatus("SCHEDULED", 3),
    getAuctionsByStatus("CLOSED", 3),
  ]);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-ink text-ivory">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-20 text-center">
          <LogoMark size={120} shape="card" />
          <h1 className="font-display max-w-2xl text-4xl font-bold leading-tight md:text-5xl">
            <span className="wing-gradient-text">{t("heroTitle")}</span>
          </h1>
          <p className="max-w-xl text-ivory/75">{t("heroSubtitle")}</p>
          <Link
            href="/auctions"
            data-testid="hero-cta"
            className="rounded-full bg-ivory px-8 py-3 font-bold text-ink transition-transform hover:scale-105"
          >
            {t("browseAuctions")}
          </Link>
        </div>
        <div className="wing-gradient h-1.5 w-full" />
      </section>

      <div className="mx-auto max-w-6xl space-y-14 px-4 py-12">
        <Section title={t("current")} items={live} empty={t("noAuctions")} testid="section-live" />
        <Section
          title={t("upcoming")}
          items={upcoming}
          empty={t("noAuctions")}
          testid="section-upcoming"
        />
        <Section
          title={t("closed")}
          items={closed}
          empty={t("noAuctions")}
          testid="section-closed"
        />
      </div>
    </div>
  );
}

function Section({
  title,
  items,
  empty,
  testid,
}: {
  title: string;
  items: Awaited<ReturnType<typeof getAuctionsByStatus>>;
  empty: string;
  testid: string;
}) {
  return (
    <section data-testid={testid}>
      <h2 className="font-display mb-5 text-2xl font-bold">{title}</h2>
      {items.length === 0 ? (
        <p className="text-ink/50">{empty}</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((a) => (
            <AuctionCard key={a.id} auction={a} />
          ))}
        </div>
      )}
    </section>
  );
}
