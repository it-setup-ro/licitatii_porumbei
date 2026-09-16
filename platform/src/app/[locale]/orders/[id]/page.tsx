import { notFound } from "next/navigation";
import { getTranslations, getLocale, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { getEurRate } from "@/lib/fx";
import { equivalentLabel } from "@/lib/fx-math";
import { formatMoney } from "@/lib/money";
import { lotLabel } from "@/lib/lots";
import ReviewForm from "@/components/ReviewForm";
import { intlLocale } from "@/lib/locales";

export const dynamic = "force-dynamic";

/**
 * Comanda cumpărătorului.
 *
 * Faza 2: plata nu mai trece prin site. Cât comanda așteaptă plata, omul vede
 * suma, datele de plată ale firmei, că se poate plăti și numerar, regula
 * „porumbeii se predau după plată" și telefonul. Plata și predarea le
 * marchează administratorul.
 */
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
      auction: {
        include: {
          pigeon: {
            include: { media: { where: { type: "IMAGE" }, orderBy: { sortIdx: "asc" }, take: 1 } },
          },
          lot: { select: { number: true } },
        },
      },
      review: true,
    },
  });
  if (!order || (order.buyerId !== user!.id && order.sellerId !== user!.id && user!.role !== "ADMIN"))
    notFound();

  const [settings, eurRate] = await Promise.all([getSettings(), getEurRate()]);
  const isBuyer = order.buyerId === user!.id;
  const isAdmin = user!.role === "ADMIN";
  const pigeon = order.auction.pigeon;
  const label =
    order.auction.lot && order.auction.lotPosition
      ? lotLabel(order.auction.lot.number, order.auction.lotPosition)
      : null;
  const reference = label ? `${t("lotPrefix", { label })} ${pigeon.name}` : pigeon.name;
  const amount = formatMoney(order.amountCents, order.currency, currentLocale);
  const equiv = eurRate ? equivalentLabel(order.amountCents, order.currency, currentLocale, eurRate) : null;
  const dateFmt = new Intl.DateTimeFormat(intlLocale(currentLocale), {
    dateStyle: "medium",
    timeZone: "Europe/Bucharest",
  });
  const iban = settings.companyIban.trim();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-display mb-6 text-3xl font-bold">
        {t("title")} · {pigeon.name}
      </h1>

      <div className="space-y-5">
        <div className="rounded-2xl border border-ink/10 bg-white p-6">
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pigeon.media[0]?.url ?? "/pigeons/p1.svg"}
              alt={pigeon.name}
              className="h-24 w-32 rounded-xl object-cover"
            />
            <div>
              {label && (
                <p className="text-xs font-bold uppercase tracking-wide text-wing-blue">
                  {t("lotPrefix", { label })}
                </p>
              )}
              <p className="font-display text-lg font-bold">{pigeon.name}</p>
              <p className="text-sm text-ink/60">{pigeon.ringNumber}</p>
              <span
                className="mt-1 inline-block rounded-full bg-ink/5 px-3 py-1 text-xs font-bold"
                data-testid="order-status"
              >
                {t(`status${order.status}` as "statusPAID")}
              </span>
            </div>
          </div>

          <dl className="mt-5 space-y-2 border-t border-ink/10 pt-4 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-ink/60">{t("amount")}</dt>
              <dd className="text-end font-bold" data-testid="order-amount">
                {amount}
                {equiv && <span className="block text-xs font-medium text-ink/50">{equiv}</span>}
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

          {order.paidAt && (
            <p className="mt-3 text-sm text-green-700" data-testid="order-paid-info">
              ✓{" "}
              {t("paidInfo", {
                date: dateFmt.format(order.paidAt),
                method: t(`method${order.paymentMethod === "CASH" ? "CASH" : "TRANSFER"}`),
              })}
            </p>
          )}
          {order.deliveredAt && (
            <p className="mt-1 text-sm text-green-700" data-testid="order-delivered-info">
              ✓ {t("deliveredInfo", { date: dateFmt.format(order.deliveredAt) })}
              {order.carrier ? ` ${t("carrierInfo", { carrier: order.carrier })}` : ""}
            </p>
          )}
          {order.status === "CANCELLED" && (
            <p className="mt-3 text-sm font-semibold text-wing-red" data-testid="order-cancelled-info">
              {t("cancelledInfo")}
            </p>
          )}
        </div>

        {order.status === "PENDING_PAYMENT" && (
          <div
            className="rounded-2xl border border-wing-blue/30 bg-wing-blue/5 p-6 text-sm"
            data-testid="payment-instructions"
          >
            <h2 className="font-display text-xl font-bold">{t("payTitle")}</h2>
            <p className="mt-2">
              {t("payAmount")}: <strong>{amount}</strong>
              {equiv ? ` (${equiv})` : ""}
            </p>

            {iban ? (
              <div className="mt-3">
                <p className="font-semibold">{t("payTransfer")}</p>
                <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                  {settings.companyName.trim() && (
                    <>
                      <dt className="text-ink/60">{t("payBeneficiary")}</dt>
                      <dd className="font-semibold">{settings.companyName}</dd>
                    </>
                  )}
                  <dt className="text-ink/60">IBAN</dt>
                  <dd className="break-all font-mono font-semibold" data-testid="pay-iban">
                    {iban}
                  </dd>
                  {settings.companyBank.trim() && (
                    <>
                      <dt className="text-ink/60">{t("payBank")}</dt>
                      <dd>{settings.companyBank}</dd>
                    </>
                  )}
                  <dt className="text-ink/60">{t("payReference")}</dt>
                  <dd>{reference}</dd>
                </dl>
              </div>
            ) : (
              <p className="mt-3" data-testid="pay-details-missing">
                {t("payDetailsMissing")}
              </p>
            )}

            <p className="mt-3">{t("payCash")}</p>
            <p className="mt-3 font-semibold">{t("payRule")}</p>
            {settings.contactPhone.trim() && (
              <p className="mt-2">{t("payPhone", { phone: settings.contactPhone })}</p>
            )}
            {isAdmin && (
              <a
                href={`/${locale}/admin/orders?status=PENDING_PAYMENT`}
                className="mt-4 inline-block font-semibold text-wing-blue hover:underline"
              >
                {t("adminManage")} →
              </a>
            )}
          </div>
        )}

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
