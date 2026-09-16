import { setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { getEurRate } from "@/lib/fx";
import { equivalentLabel } from "@/lib/fx-math";
import { formatMoney } from "@/lib/money";
import { lotLabel } from "@/lib/lots";
import OrderAdminActions from "@/components/admin/OrderAdminActions";

export const dynamic = "force-dynamic";

/**
 * Vânzări și plăți — toți porumbeii vânduți, la licitație sau la preț fix.
 * Plata se face în contul firmei sau numerar; aici adminul marchează plata,
 * predarea sau anularea unui câștigător care nu plătește.
 */

const TABS = [
  { key: "PENDING_PAYMENT", label: "Așteaptă plata" },
  { key: "PAID", label: "Plătite" },
  { key: "DELIVERED", label: "Predate" },
  { key: "CANCELLED", label: "Anulate" },
];
const STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: "așteaptă plata",
  PAID: "plătit",
  SHIPPED: "plătit",
  DELIVERED: "predat",
  CANCELLED: "anulat",
};
const METHOD: Record<string, string> = { TRANSFER: "transfer", CASH: "numerar" };

export default async function AdminOrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const status = TABS.some((t) => t.key === sp.status) ? sp.status! : "PENDING_PAYMENT";
  const q = (sp.q ?? "").trim();

  const [settings, eurRate] = await Promise.all([getSettings(), getEurRate()]);
  const contains = { contains: q, mode: "insensitive" as const };

  const [orders, counts] = await Promise.all([
    prisma.order.findMany({
      where: {
        status: status === "PAID" ? { in: ["PAID", "SHIPPED"] } : status,
        ...(q
          ? {
              OR: [
                { auction: { is: { pigeon: { is: { name: contains } } } } },
                { auction: { is: { pigeon: { is: { ringNumber: contains } } } } },
                { buyer: { is: { name: contains } } },
                { buyer: { is: { nickname: contains } } },
                { buyer: { is: { email: contains } } },
              ],
            }
          : {}),
      },
      include: {
        buyer: { select: { name: true, nickname: true, email: true, phone: true } },
        auction: {
          include: {
            pigeon: { select: { name: true, ringNumber: true, offeredBy: true } },
            lot: { include: { sale: { select: { id: true, titleRo: true } } } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const count = (key: string) =>
    counts
      .filter((c) => (key === "PAID" ? ["PAID", "SHIPPED"].includes(c.status) : c.status === key))
      .reduce((n, c) => n + c._count._all, 0);
  const dateFmt = new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium", timeZone: "Europe/Bucharest" });

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">Vânzări și plăți</h1>
      <p className="mt-1 max-w-3xl text-sm text-ink/60">
        Porumbeii vânduți la licitație sau la preț fix. Plata se face în contul firmei sau numerar,
        nu pe site: aici marchezi plata, predarea sau anularea unui câștigător care nu plătește.
        Decontul cu crescătorii e în „Deconturi” și pe pagina fiecărei licitații.
      </p>

      {!settings.companyIban && (
        <p
          className="mt-4 rounded-xl border border-wing-orange/40 bg-wing-orange/10 p-4 text-sm"
          data-testid="company-missing"
        >
          Datele de plată ale firmei nu sunt completate. Scrie-le în{" "}
          <a href={`/${locale}/admin/settings`} className="font-semibold text-wing-blue underline">
            Setări
          </a>{" "}
          (Facturare: denumire, IBAN, bancă; Contact: telefon) — apar în e-mailul câștigătorului.
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1 rounded-full border border-ink/15 p-1">
          {TABS.map((t) => (
            <a
              key={t.key}
              href={`?status=${t.key}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              data-testid={`orders-tab-${t.key.toLowerCase()}`}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
                status === t.key ? "bg-ink text-ivory" : "hover:bg-ink/5"
              }`}
            >
              {t.label} ({count(t.key)})
            </a>
          ))}
        </div>
        <form method="get" className="ms-auto">
          <input type="hidden" name="status" value={status} />
          <input
            name="q"
            defaultValue={q}
            placeholder="Caută porumbel, serie, cumpărător…"
            data-testid="orders-search"
            className="w-64 rounded-full border border-ink/15 bg-white px-4 py-2 text-sm outline-none focus:border-wing-blue"
          />
        </form>
      </div>

      {orders.length === 0 ? (
        <p className="mt-10 text-ink/50" data-testid="orders-empty">
          Nicio vânzare aici.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {orders.map((o) => {
            const a = o.auction;
            const label = a.lot && a.lotPosition ? lotLabel(a.lot.number, a.lotPosition) : null;
            const equiv = eurRate ? equivalentLabel(o.amountCents, o.currency, "ro", eurRate) : null;
            return (
              <div
                key={o.id}
                className="rounded-2xl border border-ink/10 bg-white p-4"
                data-testid="order-row"
              >
                <div className="flex flex-wrap justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-display font-bold">
                      {label ? `Lotul ${label} · ` : ""}
                      {a.pigeon.name}
                    </p>
                    <p className="text-xs text-ink/60">
                      {a.pigeon.ringNumber} ·{" "}
                      {a.lot?.sale ? (
                        <a href={`/${locale}/admin/sales/${a.lot.sale.id}`} className="text-wing-blue hover:underline">
                          {a.lot.sale.titleRo}
                        </a>
                      ) : (
                        `Preț fix · Oferit de ${a.pigeon.offeredBy || "—"}`
                      )}
                    </p>
                    <p className="mt-1 text-sm">
                      Cumpărător: <strong>{o.buyer.name}</strong>
                      {o.buyer.nickname ? ` (${o.buyer.nickname})` : ""}
                      {o.buyer.phone ? ` · ${o.buyer.phone}` : ""} ·{" "}
                      <a href={`mailto:${o.buyer.email}`} className="text-wing-blue hover:underline">
                        {o.buyer.email}
                      </a>
                    </p>
                    <p className="mt-1 text-xs text-ink/50">
                      vândut {dateFmt.format(o.createdAt)}
                      {o.paidAt ? ` · plătit ${dateFmt.format(o.paidAt)}${o.paymentMethod ? ` (${METHOD[o.paymentMethod]})` : ""}` : ""}
                      {o.deliveredAt ? ` · predat ${dateFmt.format(o.deliveredAt)}${o.carrier ? ` (${o.carrier})` : ""}` : ""}
                      {o.cancelledAt ? ` · anulat ${dateFmt.format(o.cancelledAt)}${o.cancelReason ? `: ${o.cancelReason}` : ""}` : ""}
                    </p>
                  </div>
                  <div className="text-end">
                    <p className="text-lg font-bold text-wing-orange">
                      {formatMoney(o.amountCents, o.currency, "ro")}
                    </p>
                    {equiv && <p className="text-xs text-ink/50">{equiv}</p>}
                    <p className="mt-1 text-xs font-bold uppercase tracking-wide text-ink/60" data-testid="order-row-status">
                      {STATUS_LABEL[o.status] ?? o.status}
                    </p>
                  </div>
                </div>
                {o.status !== "CANCELLED" && (
                  <OrderAdminActions orderId={o.id} status={o.status} settled={Boolean(o.settlementId)} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
