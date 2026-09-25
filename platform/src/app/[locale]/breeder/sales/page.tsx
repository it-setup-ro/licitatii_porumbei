import { getTranslations, getLocale, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { breederOfCurrentUser } from "@/lib/breeder-access";
import { buyerForBreeder } from "@/lib/breeder-view";
import { formatMoney } from "@/lib/money";
import BreederNav from "@/components/BreederNav";

export const dynamic = "force-dynamic";

/**
 * Vânzările mele — porumbeii încheiați, cu prețul și cu cine i-a luat.
 *
 * Cumpărătorul se arată după regula hotărâtă cu Daniel: până la plată doar
 * aliasul, după plată numele și localitatea (vezi lib/breeder-view.ts).
 * Telefonul și adresa rămân la administrator, care face transportul.
 */
export default async function BreederSalesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("breeder");
  const to = await getTranslations("orders");
  const currentLocale = await getLocale();

  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale });
  const acces = await breederOfCurrentUser();
  if (!acces) redirect({ href: "/account", locale });
  const { breeder } = acces!;

  const auctions = await prisma.auction.findMany({
    where: { status: "CLOSED", lot: { sale: { breederId: breeder.id } } },
    include: {
      pigeon: { select: { name: true, ringNumber: true } },
      lot: { select: { number: true } },
      order: {
        include: {
          buyer: {
            select: { name: true, nickname: true, addressCity: true, addressCountry: true },
          },
        },
      },
    },
    orderBy: [{ lot: { number: "asc" } }, { lotPosition: "asc" }],
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="font-display mb-2 text-3xl font-bold">{t("mySales")}</h1>
      <p className="mb-6 text-sm text-ink/60">{t("buyerAfterPaid")}</p>
      <BreederNav active="sales" />

      {auctions.length === 0 ? (
        <p className="mt-10 text-ink/50" data-testid="breeder-no-sales">
          {t("noSales")}
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-ink/10 bg-white">
          <table className="w-full min-w-[34rem] text-sm" data-testid="breeder-sales-table">
            <thead className="border-b border-ink/10 text-start text-xs uppercase text-ink/50">
              <tr>
                <th className="px-4 py-2.5 text-start">{t("colPigeon")}</th>
                <th className="px-4 py-2.5 text-start">{t("colPrice")}</th>
                <th className="px-4 py-2.5 text-start">{t("colBuyer")}</th>
                <th className="px-4 py-2.5 text-start">{t("colStatus")}</th>
              </tr>
            </thead>
            <tbody>
              {auctions.map((a) => {
                const buyer = a.order ? buyerForBreeder(a.order) : null;
                return (
                  <tr key={a.id} className="border-b border-ink/5 last:border-0" data-testid="breeder-sale-row">
                    <td className="px-4 py-2.5">
                      <span className="font-semibold">{a.pigeon.name}</span>
                      <span className="block text-xs text-ink/50">
                        {a.pigeon.ringNumber}
                        {a.lot && ` · ${t("lotShort", { number: a.lot.number, position: a.lotPosition ?? 0 })}`}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-semibold">
                      {formatMoney(a.order?.amountCents ?? a.currentPriceCents, a.currency, currentLocale)}
                    </td>
                    <td className="px-4 py-2.5" data-testid="breeder-sale-buyer">
                      {buyer ? (
                        <>
                          <span className={buyer.revealed ? "font-semibold" : "text-ink/70"}>{buyer.label}</span>
                          {buyer.locality && (
                            <span className="block text-xs text-ink/50">{buyer.locality}</span>
                          )}
                        </>
                      ) : (
                        <span className="text-ink/40">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          !a.order
                            ? "bg-ink/5 text-ink/60"
                            : a.order.status === "PENDING_PAYMENT"
                              ? "bg-wing-orange/15 text-wing-orange"
                              : a.order.status === "CANCELLED"
                                ? "bg-wing-red/10 text-wing-red"
                                : "bg-green-100 text-green-700"
                        }`}
                        data-testid="breeder-sale-status"
                      >
                        {a.order ? to(`status${a.order.status}` as "statusPAID") : t("unsold")}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
