import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cardInclude, toCardData } from "@/lib/queries";
import AuctionCard from "@/components/AuctionCard";
import AccountNav from "@/components/AccountNav";

export const dynamic = "force-dynamic";

export default async function WatchlistPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("account");
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale });

  const items = await prisma.watchItem.findMany({
    where: { userId: user!.id },
    include: { auction: { include: cardInclude } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display mb-6 text-3xl font-bold">{t("watchlist")}</h1>
      <AccountNav active="watchlist" />
      {items.length === 0 ? (
        <p className="mt-10 text-ink/50">{t("noWatch")}</p>
      ) : (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" data-testid="watchlist-grid">
          {items.map((w) => (
            <AuctionCard key={w.auctionId} auction={toCardData(w.auction)} />
          ))}
        </div>
      )}
    </div>
  );
}
