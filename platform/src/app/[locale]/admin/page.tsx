import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { Link } from "@/i18n/navigation";

export const dynamic = "force-dynamic";

export default async function AdminDashboard({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");

  const [pendingSellers, pendingLots, reportedReviews, liveAuctions, orders] = await Promise.all([
    prisma.user.count({ where: { sellerStatus: "PENDING" } }),
    prisma.auction.count({ where: { status: "PENDING_APPROVAL" } }),
    prisma.review.count({ where: { status: "REPORTED" } }),
    prisma.auction.count({ where: { status: "LIVE" } }),
    prisma.order.count(),
  ]);

  const cards = [
    { label: t("pendingSellers"), value: pendingSellers, href: "/admin/sellers", testid: "stat-sellers" },
    { label: t("pendingLots"), value: pendingLots, href: "/admin/lots", testid: "stat-lots" },
    { label: t("reportedReviews"), value: reportedReviews, href: "/admin/reviews", testid: "stat-reviews" },
    { label: "Live", value: liveAuctions, href: "/admin", testid: "stat-live" },
    { label: "Orders", value: orders, href: "/admin", testid: "stat-orders" },
  ];

  return (
    <div>
      <h1 className="font-display mb-8 text-3xl font-bold">{t("title")}</h1>
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((c) => (
          <Link
            key={c.testid}
            href={c.href}
            data-testid={c.testid}
            className="card-hover rounded-2xl border border-ink/10 bg-white p-5"
          >
            <p className="text-3xl font-bold">{c.value}</p>
            <p className="mt-1 text-sm text-ink/60">{c.label}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
