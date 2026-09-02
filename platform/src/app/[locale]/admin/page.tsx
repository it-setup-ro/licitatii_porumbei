import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { Link } from "@/i18n/navigation";

export const dynamic = "force-dynamic";

/**
 * Panoul de administrare.
 *
 * Sus, doar ce cere o decizie — și doar dacă chiar e ceva de făcut acolo;
 * când totul e curat, se vede un singur rând care spune asta, în loc de patru
 * cartonașe cu zero. Jos, cifrele platformei, care se citesc, nu se apasă.
 */
export default async function AdminDashboard({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");

  const [pendingSellers, pendingLots, reportedReviews, newMessages, liveAuctions, orders, members] =
    await Promise.all([
      prisma.user.count({ where: { sellerStatus: "PENDING" } }),
      prisma.auction.count({ where: { status: "PENDING_APPROVAL" } }),
      prisma.review.count({ where: { reportedAt: { not: null }, moderNote: null } }),
      prisma.contactMessage.count({ where: { handledAt: null } }),
      prisma.auction.count({ where: { status: "LIVE" } }),
      prisma.order.count(),
      prisma.user.count(),
    ]);

  const todo = [
    { label: t("pendingSellers"), value: pendingSellers, href: "/admin/sellers", testid: "stat-sellers" },
    { label: t("pendingLots"), value: pendingLots, href: "/admin/lots", testid: "stat-lots" },
    { label: t("reportedReviews"), value: reportedReviews, href: "/admin/reviews", testid: "stat-reviews" },
    { label: "Mesaje noi", value: newMessages, href: "/admin/messages", testid: "stat-messages" },
  ].filter((c) => c.value > 0);

  const stats = [
    { label: "Licitații active", value: liveAuctions, testid: "stat-live" },
    { label: "Comenzi", value: orders, testid: "stat-orders" },
    { label: "Membri", value: members, testid: "stat-members" },
  ];

  return (
    <div>
      <h1 className="font-display mb-6 text-2xl font-bold sm:text-3xl">{t("title")}</h1>

      <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-ink/40">De făcut</h2>
      {todo.length === 0 ? (
        <p
          className="rounded-2xl border border-green-300 bg-green-50 px-5 py-4 text-sm font-medium text-green-800"
          data-testid="admin-all-clear"
        >
          ✓ Nimic în așteptare. Totul e moderat la zi.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" data-testid="admin-todo">
          {todo.map((c) => (
            <Link
              key={c.testid}
              href={c.href}
              data-testid={c.testid}
              className="card-hover flex items-center gap-4 rounded-2xl border border-wing-orange/40 bg-wing-orange/5 p-5"
            >
              <span className="flex h-12 min-w-12 items-center justify-center rounded-xl bg-wing-orange px-2 text-xl font-bold text-white">
                {c.value}
              </span>
              <span className="min-w-0 text-sm font-semibold leading-snug">{c.label}</span>
            </Link>
          ))}
        </div>
      )}

      <h2 className="mb-3 mt-10 text-xs font-bold uppercase tracking-wide text-ink/40">
        Cifrele platformei
      </h2>
      <div className="grid grid-cols-3 gap-3" data-testid="admin-stats">
        {stats.map((s) => (
          <div
            key={s.testid}
            data-testid={s.testid}
            className="rounded-2xl border border-ink/10 bg-white p-4 sm:p-5"
          >
            <p className="font-display text-2xl font-bold sm:text-3xl">{s.value}</p>
            <p className="mt-1 text-xs leading-snug text-ink/60 sm:text-sm">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
