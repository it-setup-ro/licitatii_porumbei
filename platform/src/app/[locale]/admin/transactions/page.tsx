import { setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import { lotLabel } from "@/lib/lots";

export const dynamic = "force-dynamic";

/**
 * Istoricul tranzacțiilor — cerut de client: „undeva în administrare să se vadă
 * istoric tranzacții".
 *
 * Aici intră toate vânzările, inclusiv cele anulate: e evidența, nu o listă de
 * lucru (aceea e „Vânzări și plăți"). Totalurile se calculează pe ce s-a
 * filtrat, ca să poți spune cât s-a vândut într-o lună sau la un crescător.
 */

const STARI: { key: string; label: string }[] = [
  { key: "", label: "Toate" },
  { key: "PENDING_PAYMENT", label: "Așteaptă plata" },
  { key: "PAID", label: "Plătite" },
  { key: "DELIVERED", label: "Predate" },
  { key: "CANCELLED", label: "Anulate" },
];

const STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: "Așteaptă plata",
  PAID: "Plătit",
  SHIPPED: "Plătit",
  DELIVERED: "Predat",
  CANCELLED: "Anulat",
  DISPUTED: "În dispută",
};
const METODA: Record<string, string> = { TRANSFER: "Transfer", CASH: "Numerar" };

const PE_PAGINA = 100;

export default async function AdminTransactionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ from?: string; to?: string; saleId?: string; status?: string; q?: string; page?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;

  const from = /^\d{4}-\d{2}-\d{2}$/.test(sp.from ?? "") ? sp.from! : "";
  const to = /^\d{4}-\d{2}-\d{2}$/.test(sp.to ?? "") ? sp.to! : "";
  const saleId = (sp.saleId ?? "").trim();
  const status = STARI.some((s) => s.key === sp.status) ? (sp.status ?? "") : "";
  const q = (sp.q ?? "").trim();
  const page = Math.max(1, Number(sp.page ?? "1") || 1);

  const contains = { contains: q, mode: "insensitive" as const };
  const where = {
    ...(status ? { status: status === "PAID" ? { in: ["PAID", "SHIPPED"] } : status } : {}),
    ...(from || to
      ? {
          createdAt: {
            ...(from ? { gte: new Date(`${from}T00:00:00`) } : {}),
            // „până la" include toată ziua
            ...(to ? { lte: new Date(`${to}T23:59:59`) } : {}),
          },
        }
      : {}),
    ...(saleId ? { auction: { is: { lot: { is: { saleId } } } } } : {}),
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
  };

  const [settings, orders, total, sume, sales] = await Promise.all([
    getSettings(),
    prisma.order.findMany({
      where,
      include: {
        buyer: { select: { name: true, nickname: true, email: true } },
        auction: {
          include: {
            pigeon: { select: { name: true, ringNumber: true, offeredBy: true } },
            lot: { include: { sale: { include: { breeder: { select: { name: true } } } } } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PE_PAGINA,
      take: PE_PAGINA,
    }),
    prisma.order.count({ where }),
    prisma.order.aggregate({ where, _sum: { amountCents: true, commissionCents: true } }),
    prisma.sale.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, titleRo: true, breeder: { select: { name: true } } },
    }),
  ]);

  const moneda = settings.platformCurrency;
  const suma = sume._sum.amountCents ?? 0;
  const comision = sume._sum.commissionCents ?? 0;
  const dateFmt = new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium", timeZone: "Europe/Bucharest" });
  const pagini = Math.max(1, Math.ceil(total / PE_PAGINA));

  const qs = (extra: Record<string, string>) => {
    const u = new URLSearchParams();
    if (from) u.set("from", from);
    if (to) u.set("to", to);
    if (saleId) u.set("saleId", saleId);
    if (status) u.set("status", status);
    if (q) u.set("q", q);
    for (const [k, v] of Object.entries(extra)) {
      if (v) u.set(k, v);
      else u.delete(k);
    }
    return u.toString();
  };

  const input =
    "mt-1 w-full rounded-xl border border-ink/20 bg-ivory-soft px-3 py-2 text-sm outline-none focus:border-wing-blue";

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">Istoric tranzacții</h1>
      <p className="mt-1 max-w-3xl text-sm text-ink/60">
        Toate vânzările, inclusiv cele anulate. Filtrează pe perioadă, licitație sau stare, iar
        totalurile de mai jos se calculează pe ce ai filtrat. Pentru contabilitate, apasă „Descarcă
        Excel”.
      </p>

      {/* ── Filtre ── */}
      <form method="get" className="mt-6 grid gap-3 rounded-2xl border border-ink/10 bg-white p-4 sm:grid-cols-2 lg:grid-cols-5">
        <label className="text-sm font-medium">
          De la
          <input type="date" name="from" defaultValue={from} data-testid="tx-from" className={input} />
        </label>
        <label className="text-sm font-medium">
          Până la
          <input type="date" name="to" defaultValue={to} data-testid="tx-to" className={input} />
        </label>
        <label className="text-sm font-medium">
          Licitația
          <select name="saleId" defaultValue={saleId} data-testid="tx-sale" className={input}>
            <option value="">toate</option>
            {sales.map((s) => (
              <option key={s.id} value={s.id}>
                {s.breeder.name} — {s.titleRo}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          Starea
          <select name="status" defaultValue={status} data-testid="tx-status" className={input}>
            {STARI.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          Caută
          <input
            name="q"
            defaultValue={q}
            placeholder="porumbel, serie, cumpărător"
            data-testid="tx-q"
            className={input}
          />
        </label>
        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-5">
          <button
            type="submit"
            data-testid="tx-filter"
            className="rounded-xl bg-ink px-5 py-2.5 text-sm font-bold text-ivory hover:bg-wing-orange"
          >
            Filtrează
          </button>
          <a
            href={`/${locale}/admin/transactions`}
            className="rounded-xl border border-ink/20 px-5 py-2.5 text-sm font-semibold hover:border-ink/40"
          >
            Șterge filtrele
          </a>
          <a
            href={`/api/admin/transactions/export?${qs({})}`}
            data-testid="tx-export"
            className="ms-auto rounded-xl border border-ink/20 px-5 py-2.5 text-sm font-semibold hover:border-wing-blue"
          >
            Descarcă Excel
          </a>
        </div>
      </form>

      {/* ── Totaluri pe ce s-a filtrat ── */}
      <dl className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4" data-testid="tx-totals">
        {[
          ["Tranzacții", String(total)],
          ["Total vândut", formatMoney(suma, moneda, "ro")],
          ["Comision platformă", formatMoney(comision, moneda, "ro")],
          ["Rămas crescătorilor", formatMoney(suma - comision, moneda, "ro")],
        ].map(([eticheta, valoare]) => (
          <div key={eticheta} className="rounded-2xl border border-ink/10 bg-white p-4">
            <dt className="text-xs font-bold uppercase tracking-wide text-ink/50">{eticheta}</dt>
            <dd className="font-display mt-1 text-2xl font-bold">{valoare}</dd>
          </div>
        ))}
      </dl>

      {/* ── Lista ── */}
      {orders.length === 0 ? (
        <p className="mt-6 text-ink/50" data-testid="tx-empty">
          Nicio tranzacție pentru filtrele alese.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-ink/10 bg-white">
          <table className="w-full min-w-[60rem] text-sm" data-testid="tx-table">
            <thead className="border-b border-ink/10 text-start text-xs uppercase tracking-wide text-ink/50">
              <tr>
                <th className="px-4 py-3 text-start">Data</th>
                <th className="px-4 py-3 text-start">Porumbel</th>
                <th className="px-4 py-3 text-start">Licitație / Oferit de</th>
                <th className="px-4 py-3 text-start">Cumpărător</th>
                <th className="px-4 py-3 text-end">Preț</th>
                <th className="px-4 py-3 text-end">Comision</th>
                <th className="px-4 py-3 text-start">Stare</th>
                <th className="px-4 py-3 text-start">Plată</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const lot = o.auction.lot;
                const eticheta =
                  lot && o.auction.lotPosition ? lotLabel(lot.number, o.auction.lotPosition) : null;
                return (
                  <tr key={o.id} className="border-b border-ink/5 last:border-0" data-testid="tx-row">
                    <td className="whitespace-nowrap px-4 py-3 text-ink/70">
                      {dateFmt.format(o.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={`/${locale}/auctions/${o.auctionId}`}
                        className="font-semibold text-wing-blue hover:underline"
                      >
                        {eticheta ? `${eticheta} ` : ""}
                        {o.auction.pigeon.name}
                      </a>
                      <div className="text-xs text-ink/50">{o.auction.pigeon.ringNumber}</div>
                    </td>
                    <td className="px-4 py-3 text-ink/70">
                      {lot ? `${lot.sale.breeder.name} — ${lot.sale.titleRo}` : (o.auction.pigeon.offeredBy ?? "—")}
                    </td>
                    <td className="px-4 py-3">
                      {o.buyer.nickname ?? o.buyer.name}
                      <div className="text-xs text-ink/50">{o.buyer.email}</div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-end font-semibold">
                      {formatMoney(o.amountCents, o.currency, "ro")}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-end text-ink/70">
                      {formatMoney(o.commissionCents, o.currency, "ro")}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-bold uppercase tracking-wide text-ink/60">
                        {STATUS_LABEL[o.status] ?? o.status}
                      </span>
                      {o.settlementId && <div className="text-xs text-ink/50">decontat</div>}
                    </td>
                    <td className="px-4 py-3 text-ink/70">
                      {o.paymentMethod ? METODA[o.paymentMethod] : "—"}
                      {o.paidAt && <div className="text-xs text-ink/50">{dateFmt.format(o.paidAt)}</div>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Paginare: la câteva sute de vânzări, restul nu mai încape ── */}
      {pagini > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm" data-testid="tx-pages">
          <span className="text-ink/60">
            Pagina {page} din {pagini} · {total} tranzacții
          </span>
          <span className="flex gap-2">
            {page > 1 && (
              <a
                href={`?${qs({ page: String(page - 1) })}`}
                className="rounded-xl border border-ink/20 px-4 py-2 font-semibold hover:border-wing-blue"
              >
                ← mai noi
              </a>
            )}
            {page < pagini && (
              <a
                href={`?${qs({ page: String(page + 1) })}`}
                data-testid="tx-next"
                className="rounded-xl border border-ink/20 px-4 py-2 font-semibold hover:border-wing-blue"
              >
                mai vechi →
              </a>
            )}
          </span>
        </div>
      )}
    </div>
  );
}
