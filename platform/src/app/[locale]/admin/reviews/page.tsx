import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import StarRating from "@/components/StarRating";
import ModerationButtons from "@/components/admin/ModerationButtons";

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");

  // coada de moderare: raportate si neanalizate inca de un admin
  const reported = await prisma.review.findMany({
    where: { reportedAt: { not: null }, moderNote: null },
    include: { author: true, seller: true },
    orderBy: { reportedAt: "asc" },
  });

  return (
    <div>
      <h1 className="font-display mb-8 text-3xl font-bold">{t("reportedReviews")}</h1>
      {reported.length === 0 ? (
        <p className="text-ink/50" data-testid="no-reported-reviews">
          {t("noPending")}
        </p>
      ) : (
        <div className="space-y-4">
          {reported.map((r) => (
            <div
              key={r.id}
              className="rounded-2xl border border-ink/10 bg-white p-5"
              data-testid="reported-review-row"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="text-sm">
                  <div className="flex items-center gap-2">
                    <StarRating rating={r.rating} />
                    <span className="font-semibold">{r.author.name}</span>
                    <span className="text-ink/50">→ {r.seller.name}</span>
                  </div>
                  {r.comment && <p className="mt-1 text-ink/80">{r.comment}</p>}
                  <p className="mt-1 text-xs text-wing-red">Raport: {r.reportReason}</p>
                </div>
                <ModerationButtons
                  endpoint={`/api/admin/reviews/${r.id}`}
                  approveAction="KEEP"
                  rejectAction="HIDE"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
