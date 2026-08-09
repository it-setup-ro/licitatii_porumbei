import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cardInclude, toCardData } from "@/lib/queries";
import AuctionCard from "@/components/AuctionCard";
import AccountNav from "@/components/AccountNav";

export const dynamic = "force-dynamic";

export default async function MyBidsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("account");
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale });

  const myBidAuctionIds = await prisma.bid.findMany({
    where: { bidderId: user!.id },
    select: { auctionId: true, isLeading: true },
    distinct: ["auctionId"],
  });
  const auctions = await prisma.auction.findMany({
    where: { id: { in: myBidAuctionIds.map((b) => b.auctionId) } },
    include: cardInclude,
    orderBy: { endsAt: "asc" },
  });
  const leadingCount = await prisma.bid.count({
    where: { bidderId: user!.id, isLeading: true, auction: { status: "LIVE" } },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display mb-6 text-3xl font-bold">{t("myBids")}</h1>
      <AccountNav active="bids" />
      <p className="mt-4 text-sm font-semibold text-wing-blue" data-testid="leading-count">
        {t("leadingBids", { count: leadingCount })}
      </p>
      {auctions.length === 0 ? (
        <p className="mt-10 text-ink/50">{t("noBids")}</p>
      ) : (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {auctions.map((a) => (
            <AuctionCard key={a.id} auction={toCardData(a)} />
          ))}
        </div>
      )}
    </div>
  );
}
