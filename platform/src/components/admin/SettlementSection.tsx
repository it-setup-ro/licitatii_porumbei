import { formatMoney } from "@/lib/money";
import { lotLabel } from "@/lib/lots";
import { loadSettlementGroup, type SettlementGroup } from "@/lib/orders";
import SettlementActions from "./SettlementActions";

/**
 * Decontul unui grup (licitația crescătorului sau, la preț fix, „Oferit de"):
 * cât s-a vândut și s-a plătit, comisionul, cât primește crescătorul, cine încă
 * n-a plătit și deconturile deja făcute.
 */
export default async function SettlementSection({
  group,
  title,
  subtitle,
  currency,
}: {
  group: SettlementGroup;
  title: string;
  subtitle?: string;
  currency: string;
}) {
  const { orders, settlements, summary } = await loadSettlementGroup(group);
  const fmt = (c: number) => formatMoney(c, currency, "ro");
  const dateFmt = new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium", timeZone: "Europe/Bucharest" });
  const unpaid = orders.filter((o) => o.status === "PENDING_PAYMENT");
  const exportHref =
    "saleId" in group
      ? `/api/admin/settlements/export?saleId=${group.saleId}`
      : `/api/admin/settlements/export?offeredBy=${encodeURIComponent(group.offeredBy)}`;

  const name = (o: (typeof orders)[number]) => {
    const a = o.auction;
    return `${a.lot && a.lotPosition ? `Lotul ${lotLabel(a.lot.number, a.lotPosition)} ` : ""}${a.pigeon.name}`;
  };

  return (
    <section className="mt-8 rounded-2xl border border-ink/10 bg-white p-6" data-testid="settlement">
      <h2 className="font-display text-xl font-bold">Decont — {title}</h2>
      {subtitle && <p className="mt-1 text-sm text-ink/60">{subtitle}</p>}

      <dl className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-ivory-soft p-3">
          <dt className="text-xs uppercase tracking-wide text-ink/50">
            Total vândut — plătiți, nedecontați ({summary.due.count})
          </dt>
          <dd className="mt-1 text-lg font-bold" data-testid="settlement-total">
            {fmt(summary.due.totalCents)}
          </dd>
        </div>
        <div className="rounded-xl bg-ivory-soft p-3">
          <dt className="text-xs uppercase tracking-wide text-ink/50">Comision</dt>
          <dd className="mt-1 text-lg font-bold" data-testid="settlement-commission">
            {fmt(summary.due.commissionCents)}
          </dd>
        </div>
        <div className="rounded-xl bg-wing-blue/10 p-3">
          <dt className="text-xs uppercase tracking-wide text-ink/60">De plătit crescătorului</dt>
          <dd className="mt-1 text-xl font-bold text-wing-blue" data-testid="settlement-payout">
            {fmt(summary.due.payoutCents)}
          </dd>
        </div>
      </dl>

      <p className="mt-3 text-sm text-ink/70" data-testid="settlement-unpaid">
        {unpaid.length === 0
          ? "Niciun porumbel neplătit."
          : `Încă neplătiți (nu intră în decont): ${unpaid.length} — ${fmt(summary.unpaid.totalCents)}`}
      </p>
      {unpaid.length > 0 && (
        <ul className="mt-1 list-disc pl-5 text-sm text-ink/60">
          {unpaid.map((o) => (
            <li key={o.id}>
              {name(o)} — {fmt(o.amountCents)} — {o.buyer.nickname ?? o.buyer.name}
            </li>
          ))}
        </ul>
      )}

      <SettlementActions
        saleId={"saleId" in group ? group.saleId : undefined}
        offeredBy={"offeredBy" in group ? group.offeredBy : undefined}
        canSettle={summary.due.count > 0}
        payoutLabel={fmt(summary.due.payoutCents)}
        exportHref={exportHref}
      />

      {settlements.length > 0 && (
        <div className="mt-5 border-t border-ink/10 pt-4">
          <h3 className="text-xs font-bold uppercase tracking-wide text-ink/50">Deconturi făcute</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {settlements.map((s) => (
              <li key={s.id} data-testid="settlement-history-row">
                {dateFmt.format(s.settledAt)} — {s.orderCount}{" "}
                {s.orderCount === 1 ? "porumbel" : "porumbei"} — total {fmt(s.totalCents)}, comision{" "}
                {fmt(s.commissionCents)}, plătit crescătorului <strong>{fmt(s.payoutCents)}</strong>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
