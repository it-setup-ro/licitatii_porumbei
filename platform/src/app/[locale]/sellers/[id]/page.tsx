import { notFound } from "next/navigation";
import { getTranslations, getLocale, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { toCardData, cardInclude } from "@/lib/queries";
import AuctionCard from "@/components/AuctionCard";
import StarRating from "@/components/StarRating";

export const dynamic = "force-dynamic";

export default async function SellerProfilePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("reviews");
  const ta = await getTranslations("auction");
  const currentLocale = await getLocale();

  const seller = await prisma.user.findUnique({ where: { id } });
  if (!seller || seller.sellerStatus !== "APPROVED") notFound();

  const [stats, reviews, auctions] = await Promise.all([
    prisma.review.aggregate({
      where: { sellerId: id, status: "VISIBLE" },
      _avg: { rating: true },
      _count: true,
    }),
    prisma.review.findMany({
      where: { sellerId: id, status: "VISIBLE" },
      include: { author: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.auction.findMany({
      where: { sellerId: id, status: { in: ["LIVE", "SCHEDULED"] } },
      include: cardInclude,
      orderBy: { endsAt: "asc" },
      take: 12,
    }),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="rounded-2xl border border-ink/10 bg-white p-6">
        <h1 className="font-display text-3xl font-bold" data-testid="seller-name">
          {seller.sellerCompany ?? seller.name}
        </h1>
        {stats._count > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <StarRating rating={stats._avg.rating ?? 0} size={20} />
            <span className="text-sm text-ink/60">
              {t("sellerRating", {
                rating: (stats._avg.rating ?? 0).toFixed(1),
                count: stats._count,
              })}
            </span>
          </div>
        )}
        {seller.sellerBio && <p className="mt-4 max-w-2xl text-ink/80">{seller.sellerBio}</p>}
      </div>

      {auctions.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display mb-5 text-2xl font-bold">{ta("statusLive")}</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {auctions.map((a) => (
              <AuctionCard key={a.id} auction={toCardData(a)} />
            ))}
          </div>
        </section>
      )}

      <section className="mt-10" data-testid="seller-reviews">
        <h2 className="font-display mb-5 text-2xl font-bold">{t("title")}</h2>
        {reviews.length === 0 ? (
          <p className="text-ink/50">{t("noReviews")}</p>
        ) : (
          <div className="space-y-4">
            {reviews.map((r) => (
              <div key={r.id} className="rounded-2xl border border-ink/10 bg-white p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <StarRating rating={r.rating} />
                    <span className="text-sm font-semibold">{r.author.name}</span>
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      {t("verifiedPurchase")}
                    </span>
                  </div>
                  <span className="text-xs text-ink/50">
                    {new Intl.DateTimeFormat(currentLocale === "ro" ? "ro-RO" : "en-GB", {
                      dateStyle: "medium",
                    }).format(r.createdAt)}
                  </span>
                </div>
                {r.comment && <p className="mt-2 text-sm text-ink/80">{r.comment}</p>}
                {r.sellerReply && (
                  <div className="mt-3 rounded-xl bg-ivory-soft p-3 text-sm">
                    <p className="text-xs font-bold uppercase tracking-wide text-ink/50">
                      {t("reply")}
                    </p>
                    <p className="mt-1 text-ink/80">{r.sellerReply}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
