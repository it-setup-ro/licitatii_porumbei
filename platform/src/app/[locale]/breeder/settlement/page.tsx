import { getTranslations, getLocale, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { breederOfCurrentUser } from "@/lib/breeder-access";
import { settlementSummary } from "@/lib/settlement-math";
import { getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import { intlLocale } from "@/lib/locales";
import BreederNav from "@/components/BreederNav";

export const dynamic = "force-dynamic";

/**
 * Decontul meu — aceeași socoteală pe care o vede administratorul, din partea
 * crescătorului: intră doar porumbeii plătiți și nedecontați, iar cei neplătiți
 * stau separat, ca să nu pară bani care vin. Sumele se închid la „Marchează
 * decontat", apăsat de administrator.
 */
export default async function BreederSettlementPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("breeder");
  const currentLocale = await getLocale();

  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale });
  const acces = await breederOfCurrentUser();
  if (!acces) redirect({ href: "/account", locale });
  const { breeder } = acces!;

  const { platformCurrency } = await getSettings();
  const sales = await prisma.sale.findMany({
    where: { breederId: breeder.id },
    select: { id: true },
  });
  const saleIds = sales.map((s) => s.id);

  const [orders, settlements] = await Promise.all([
    prisma.order.findMany({
      where: { status: { not: "CANCELLED" }, auction: { lot: { saleId: { in: saleIds } } } },
      select: { status: true, amountCents: true, commissionCents: true, settlementId: true },
    }),
    prisma.settlement.findMany({
      where: { saleId: { in: saleIds } },
      orderBy: { settledAt: "desc" },
    }),
  ]);

  const sumar = settlementSummary(orders);
  const bani = (cents: number) => formatMoney(cents, platformCurrency, currentLocale);
  const cand = (d: Date) =>
    new Intl.DateTimeFormat(intlLocale(currentLocale), { dateStyle: "medium" }).format(d);

  const card = (label: string, value: string, hint: string | null, testid: string) => (
    <div className="rounded-2xl border border-ink/10 bg-white p-5" data-testid={testid}>
      <p className="text-xs uppercase text-ink/50">{label}</p>
      <p className="font-display mt-1 text-2xl font-bold">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink/50">{hint}</p>}
    </div>
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="font-display mb-2 text-3xl font-bold">{t("mySettlement")}</h1>
      <p className="mb-6 text-sm text-ink/60">{t("settlementIntro")}</p>
      <BreederNav active="settlement" />

      {orders.length === 0 && settlements.length === 0 ? (
        <p className="mt-10 text-ink/50" data-testid="breeder-no-settlement">
          {t("noSettlement")}
        </p>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {card(
              t("due"),
              bani(sumar.due.payoutCents),
              t("pigeonsPaid", { count: sumar.due.count }),
              "breeder-due"
            )}
            {card(t("commissionKept"), bani(sumar.due.commissionCents), null, "breeder-commission")}
            {card(
              t("unpaid"),
              bani(sumar.unpaid.totalCents),
              t("pigeonsWaiting", { count: sumar.unpaid.count }),
              "breeder-unpaid"
            )}
          </div>

          <h2 className="font-display mt-10 text-xl font-bold">{t("settlements")}</h2>
          {settlements.length === 0 ? (
            <p className="mt-2 text-sm text-ink/50" data-testid="breeder-settlements-empty">
              {t("noSettlementsYet")}
            </p>
          ) : (
            <div className="mt-3 overflow-x-auto rounded-2xl border border-ink/10 bg-white">
              <table className="w-full min-w-[28rem] text-sm" data-testid="breeder-settlements-table">
                <tbody>
                  {settlements.map((s) => (
                    <tr key={s.id} className="border-b border-ink/5 last:border-0">
                      <td className="px-4 py-2.5">{cand(s.settledAt)}</td>
                      <td className="px-4 py-2.5 text-ink/60">
                        {t("pigeonsPaid", { count: s.orderCount })}
                      </td>
                      <td className="px-4 py-2.5 font-semibold">{bani(s.payoutCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
