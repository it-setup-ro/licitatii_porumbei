import { getTranslations, getLocale, setRequestLocale } from "next-intl/server";
import { redirect, Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import AccountNav from "@/components/AccountNav";

export const dynamic = "force-dynamic";

export default async function PurchasesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("account");
  const to = await getTranslations("orders");
  const currentLocale = await getLocale();
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale });

  const orders = await prisma.order.findMany({
    where: { buyerId: user!.id },
    include: { auction: { include: { pigeon: true } }, review: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="font-display mb-6 text-3xl font-bold">{t("purchases")}</h1>
      <AccountNav active="purchases" />
      {orders.length === 0 ? (
        <p className="mt-10 text-ink/50">{t("noPurchases")}</p>
      ) : (
        <div className="mt-6 space-y-4" data-testid="purchases-list">
          {orders.map((o) => (
            <Link
              key={o.id}
              href={`/orders/${o.id}`}
              className="card-hover flex items-center justify-between rounded-2xl border border-ink/10 bg-white p-5"
              data-testid="purchase-row"
            >
              <div>
                <p className="font-display font-bold">
                  {o.auction.pigeon.name}
                </p>
                <p className="text-sm text-ink/60">
                  {formatMoney(o.amountCents, o.currency, currentLocale)}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  o.status === "PENDING_PAYMENT"
                    ? "bg-wing-orange/15 text-wing-orange"
                    : "bg-green-100 text-green-700"
                }`}
                data-testid="order-status"
              >
                {to(`status${o.status}` as "statusPAID")}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
