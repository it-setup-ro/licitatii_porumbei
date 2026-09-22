import { setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import ShopOrderActions from "@/components/admin/ShopOrderActions";

export const dynamic = "force-dynamic";

/**
 * Comenzile din magazin.
 *
 * Până acum nu aveau niciun ecran: clientul comanda, stocul scădea, iar comanda
 * rămânea invizibilă. Aici se văd, cu adresa de livrare, și se mută prin stări.
 */

const TABS = [
  { key: "PENDING_PAYMENT", label: "Așteaptă plata" },
  { key: "PAID", label: "Plătite" },
  { key: "SHIPPED", label: "Expediate" },
  { key: "DELIVERED", label: "Livrate" },
  { key: "CANCELLED", label: "Anulate" },
];

const STATUS_LABEL: Record<string, string> = Object.fromEntries(TABS.map((t) => [t.key, t.label]));

const PE_PAGINA = 50;

export default async function AdminShopOrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const status = TABS.some((t) => t.key === sp.status) ? sp.status! : "PENDING_PAYMENT";
  const q = (sp.q ?? "").trim();
  const page = Math.max(1, Number(sp.page ?? "1") || 1);

  const contains = { contains: q, mode: "insensitive" as const };
  const where = {
    status,
    ...(q
      ? {
          OR: [
            { shippingName: contains },
            { shippingPhone: contains },
            { shippingAddress: contains },
            { buyer: { is: { email: contains } } },
            { buyer: { is: { name: contains } } },
          ],
        }
      : {}),
  };

  const [orders, total, counts] = await Promise.all([
    prisma.shopOrder.findMany({
      where,
      include: {
        buyer: { select: { name: true, email: true, phone: true } },
        items: { select: { id: true, nameSnapshot: true, quantity: true, priceCents: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PE_PAGINA,
      take: PE_PAGINA,
    }),
    prisma.shopOrder.count({ where }),
    prisma.shopOrder.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const count = (key: string) => counts.find((c) => c.status === key)?._count._all ?? 0;
  const dateFmt = new Intl.DateTimeFormat("ro-RO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Bucharest",
  });
  const pagini = Math.max(1, Math.ceil(total / PE_PAGINA));

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">Comenzi magazin</h1>
      <p className="mt-1 max-w-3xl text-sm text-ink/60">
        Comenzile de produse, cu adresa de livrare. Plata se face în afara site-ului, ca la
        porumbei: marchezi aici când ai încasat și când ai expediat. La anulare, produsele se întorc
        în stoc.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1 rounded-full border border-ink/15 p-1">
          {TABS.map((t) => (
            <a
              key={t.key}
              href={`?status=${t.key}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              data-testid={`shop-tab-${t.key.toLowerCase()}`}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
                status === t.key ? "bg-ink text-ivory" : "hover:bg-ink/5"
              }`}
            >
              {t.label}
              {count(t.key) > 0 && <span className="ms-1.5 text-xs opacity-70">{count(t.key)}</span>}
            </a>
          ))}
        </div>
        <form method="get" className="flex gap-2">
          <input type="hidden" name="status" value={status} />
          <input
            name="q"
            defaultValue={q}
            placeholder="nume, telefon, adresă, e-mail"
            data-testid="shop-search"
            className="rounded-xl border border-ink/20 bg-ivory-soft px-3 py-2 text-sm outline-none focus:border-wing-blue"
          />
          <button
            type="submit"
            className="rounded-xl border border-ink/20 px-4 py-2 text-sm font-semibold hover:border-wing-blue"
          >
            Caută
          </button>
        </form>
      </div>

      {orders.length === 0 ? (
        <p className="mt-6 text-ink/50" data-testid="no-shop-orders">
          Nicio comandă aici.
        </p>
      ) : (
        <div className="mt-6 space-y-4">
          {orders.map((o) => (
            <div
              key={o.id}
              data-testid="shop-order-row"
              className="rounded-2xl border border-ink/10 bg-white p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 text-sm">
                  <p className="font-display text-lg font-bold">
                    {o.shippingName}
                    <span className="ms-2 text-xs font-bold uppercase tracking-wide text-ink/50">
                      {STATUS_LABEL[o.status] ?? o.status}
                    </span>
                  </p>
                  <p className="mt-1 text-ink/70">
                    ☎ {o.shippingPhone} · ✉ {o.buyer.email}
                  </p>
                  <p className="mt-1 text-ink/70">⌂ {o.shippingAddress}</p>
                  {o.note && <p className="mt-1 text-ink/60">Mențiune: {o.note}</p>}
                  <p className="mt-1 text-xs text-ink/50">
                    {dateFmt.format(o.createdAt)}
                    {o.paidAt ? ` · plătită ${dateFmt.format(o.paidAt)}` : ""}
                  </p>
                </div>
                <div className="text-end">
                  <p className="font-display text-xl font-bold">
                    {formatMoney(o.totalCents, o.currency, "ro")}
                  </p>
                  {o.shippingCents > 0 && (
                    <p className="text-xs text-ink/50">
                      din care transport {formatMoney(o.shippingCents, o.currency, "ro")}
                    </p>
                  )}
                </div>
              </div>

              <ul className="mt-3 border-t border-ink/10 pt-3 text-sm text-ink/70">
                {o.items.map((it) => (
                  <li key={it.id} data-testid="shop-order-item">
                    {it.quantity} × {it.nameSnapshot} — {formatMoney(it.priceCents * it.quantity, o.currency, "ro")}
                  </li>
                ))}
              </ul>

              <div className="mt-4">
                <ShopOrderActions orderId={o.id} status={o.status} />
              </div>
            </div>
          ))}
        </div>
      )}

      {pagini > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm" data-testid="shop-pages">
          <span className="text-ink/60">
            Pagina {page} din {pagini} · {total} comenzi
          </span>
          <span className="flex gap-2">
            {page > 1 && (
              <a
                href={`?status=${status}${q ? `&q=${encodeURIComponent(q)}` : ""}&page=${page - 1}`}
                className="rounded-xl border border-ink/20 px-4 py-2 font-semibold hover:border-wing-blue"
              >
                ← mai noi
              </a>
            )}
            {page < pagini && (
              <a
                href={`?status=${status}${q ? `&q=${encodeURIComponent(q)}` : ""}&page=${page + 1}`}
                data-testid="shop-next"
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
