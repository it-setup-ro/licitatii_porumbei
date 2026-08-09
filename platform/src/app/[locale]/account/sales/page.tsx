import { getTranslations, getLocale, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import AccountNav from "@/components/AccountNav";
import OrderActions from "@/components/OrderActions";

export const dynamic = "force-dynamic";

export default async function SalesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("account");
  const to = await getTranslations("orders");
  const currentLocale = await getLocale();
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale });

  const orders = await prisma.order.findMany({
    where: { sellerId: user!.id },
    include: { auction: { include: { pigeon: true } }, buyer: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="font-display mb-6 text-3xl font-bold">{t("sales")}</h1>
      <AccountNav active="sales" />
      {orders.length === 0 ? (
        <p className="mt-10 text-ink/50">{t("noSales")}</p>
      ) : (
        <div className="mt-6 space-y-4" data-testid="sales-list">
          {orders.map((o) => (
            <div
              key={o.id}
              className="rounded-2xl border border-ink/10 bg-white p-5"
              data-testid="sale-row"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-display font-bold">
                    {currentLocale === "en" ? o.auction.pigeon.titleEn : o.auction.pigeon.titleRo}
                  </p>
                  <p className="text-sm text-ink/60">
                    {formatMoney(o.amountCents, o.currency, currentLocale)} ·{" "}
                    {to("commission")}: {formatMoney(o.commissionCents, o.currency, currentLocale)}
                  </p>
                  <p className="text-xs text-ink/50">Payout: {o.payoutStatus}</p>
                </div>
                <span className="rounded-full bg-ink/5 px-3 py-1 text-xs font-bold">
                  {to(`status${o.status}` as "statusPAID")}
                </span>
              </div>
              {o.status === "PAID" && <OrderActions orderId={o.id} action="SHIP" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
