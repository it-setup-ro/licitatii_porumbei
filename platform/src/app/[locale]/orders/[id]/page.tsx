import { notFound } from "next/navigation";
import { getTranslations, getLocale, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import PayButton from "@/components/PayButton";
import ReviewForm from "@/components/ReviewForm";
import OrderActions from "@/components/OrderActions";

export const dynamic = "force-dynamic";

export default async function OrderPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("orders");
  const currentLocale = await getLocale();
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale });

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      auction: { include: { pigeon: { include: { media: { take: 1 } } } } },
      seller: true,
      review: true,
    },
  });
  if (!order || (order.buyerId !== user!.id && order.sellerId !== user!.id && user!.role !== "ADMIN"))
    notFound();

  const settings = await getSettings();
  const isBuyer = order.buyerId === user!.id;
  const title =
    order.auction.pigeon.name;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-display mb-6 text-3xl font-bold">
        {t("title")} · {title}
      </h1>

      <div className="space-y-5">
        <div className="rounded-2xl border border-ink/10 bg-white p-6">
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={order.auction.pigeon.media[0]?.url ?? "/pigeons/p1.svg"}
              alt={title}
              className="h-24 w-32 rounded-xl object-cover"
            />
            <div>
              <p className="font-display text-lg font-bold">{title}</p>
              <p className="text-sm text-ink/60">{order.auction.pigeon.ringNumber}</p>
              <span
                className="mt-1 inline-block rounded-full bg-ink/5 px-3 py-1 text-xs font-bold"
                data-testid="order-status"
              >
                {t(`status${order.status}` as "statusPAID")}
              </span>
            </div>
          </div>

          <dl className="mt-5 space-y-2 border-t border-ink/10 pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink/60">{t("amount")}</dt>
              <dd className="font-bold" data-testid="order-amount">
                {formatMoney(order.amountCents, order.currency, currentLocale)}
              </dd>
            </div>
            {!isBuyer && (
              <div className="flex justify-between">
                <dt className="text-ink/60">{t("commission")}</dt>
                <dd className="font-semibold text-wing-red">
                  −{formatMoney(order.commissionCents, order.currency, currentLocale)}
                </dd>
              </div>
            )}
          </dl>
          <p className="mt-3 text-xs text-ink/50">
            {t(
              `payout${settings.payoutMode}` as "payoutIMMEDIATE",
              settings.payoutMode === "AFTER_DAYS" ? { days: settings.payoutAfterDays } : {}
            )}
          </p>
        </div>

        {isBuyer && order.status === "PENDING_PAYMENT" && (
          <PayButton orderId={order.id} amountLabel={formatMoney(order.amountCents, order.currency, currentLocale)} />
        )}

        {isBuyer && order.status === "SHIPPED" && <OrderActions orderId={order.id} action="DELIVER" />}

        {isBuyer && ["PAID", "SHIPPED", "DELIVERED"].includes(order.status) && !order.review && (
          <ReviewForm orderId={order.id} />
        )}
        {order.review && (
          <div className="rounded-2xl border border-ink/10 bg-white p-5 text-sm" data-testid="order-review">
            <p className="font-semibold">★ {order.review.rating}/5</p>
            {order.review.comment && <p className="mt-1 text-ink/80">{order.review.comment}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
