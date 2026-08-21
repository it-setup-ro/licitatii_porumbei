import { getTranslations, getLocale, setRequestLocale } from "next-intl/server";
import { redirect, Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import AccountNav from "@/components/AccountNav";

export const dynamic = "force-dynamic";

export default async function ShopOrdersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("cart");
  const to = await getTranslations("orders");
  const currentLocale = await getLocale();
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale });

  const orders = await prisma.shopOrder.findMany({
    where: { buyerId: user!.id },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="font-display mb-6 text-3xl font-bold">{t("myOrders")}</h1>
      <AccountNav active="shop" />

      {orders.length === 0 ? (
        <p className="mt-10 text-ink/50" data-testid="no-shop-orders">
          {t("empty")}
        </p>
      ) : (
        <div className="mt-6 space-y-3" data-testid="shop-orders-list">
          {orders.map((o) => (
            <Link
              key={o.id}
              href={`/account/shop-orders/${o.id}`}
              className="card-hover flex items-center justify-between rounded-2xl border border-ink/10 bg-white p-5"
              data-testid="shop-order-row"
            >
              <div>
                <p className="font-display font-bold">
                  {t("orderNumber", { id: o.id.slice(0, 8).toUpperCase() })}
                </p>
                <p className="text-sm text-ink/60">
                  {o.items.length} × {t("product").toLowerCase()} ·{" "}
                  {formatMoney(o.totalCents, o.currency, currentLocale)}
                </p>
              </div>
              <span className="rounded-full bg-ink/5 px-3 py-1 text-xs font-bold">
                {to(`status${o.status}` as "statusPAID")}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
