import { notFound } from "next/navigation";
import { getTranslations, getLocale, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import AccountNav from "@/components/AccountNav";

export const dynamic = "force-dynamic";

export default async function ShopOrderPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("cart");
  const to = await getTranslations("orders");
  const currentLocale = await getLocale();
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale });

  const order = await prisma.shopOrder.findUnique({
    where: { id },
    include: { items: { include: { product: true } } },
  });
  if (!order || (order.buyerId !== user!.id && user!.role !== "ADMIN")) notFound();

  const fmt = (c: number) => formatMoney(c, order.currency, currentLocale);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display mb-6 text-3xl font-bold">
        {t("orderNumber", { id: order.id.slice(0, 8).toUpperCase() })}
      </h1>
      <AccountNav active="shop" />

      <div className="mt-6 space-y-5">
        <p
          className="rounded-2xl border border-green-300 bg-green-50 p-4 font-semibold text-green-800"
          data-testid="shop-order-placed"
        >
          ✓ {t("orderPlaced")}
        </p>

        <div className="rounded-2xl border border-ink/10 bg-white p-5" data-testid="shop-order-items">
          {order.items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between border-b border-ink/5 py-2 last:border-0"
            >
              <span className="text-sm">
                {item.nameSnapshot} × {item.quantity}
              </span>
              <span className="font-semibold">{fmt(item.priceCents * item.quantity)}</span>
            </div>
          ))}
          <div className="mt-3 space-y-1 border-t border-ink/10 pt-3 text-sm">
            <div className="flex justify-between">
              <span className="text-ink/60">{t("subtotal")}</span>
              <span>{fmt(order.subtotalCents)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink/60">{t("shipping")}</span>
              <span>{fmt(order.shippingCents)}</span>
            </div>
            <div className="flex justify-between pt-1 text-lg font-bold">
              <span>{t("total")}</span>
              <span className="text-wing-orange" data-testid="shop-order-total">
                {fmt(order.totalCents)}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-ink/10 bg-white p-5 text-sm">
          <p className="font-semibold">{t("shippingData")}</p>
          <p className="mt-1 text-ink/70">
            {order.shippingName} · {order.shippingPhone}
          </p>
          <p className="text-ink/70">{order.shippingAddress}</p>
          {order.note && <p className="mt-2 italic text-ink/60">{order.note}</p>}
          <p className="mt-3">
            <span className="rounded-full bg-ink/5 px-3 py-1 text-xs font-bold" data-testid="shop-order-status">
              {to(`status${order.status}` as "statusPAID")}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
