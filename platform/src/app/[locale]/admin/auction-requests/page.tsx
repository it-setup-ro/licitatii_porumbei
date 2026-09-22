import { setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import Pager from "@/components/admin/Pager";
import RequestHandledButton from "@/components/admin/RequestHandledButton";
import RowActions from "@/components/admin/RowActions";

export const dynamic = "force-dynamic";

/**
 * Cererile „Vreau să organizez o licitație", de pe prima pagină.
 *
 * Cele nerezolvate stau sus: administratorul sună omul și apoi o bifează, ca să
 * nu sune de două ori și să nu uite pe nimeni.
 */
export default async function AdminAuctionRequestsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const PE_PAGINA = 50;

  const requests = await prisma.auctionRequest.findMany({
    orderBy: [{ handledAt: "asc" }, { createdAt: "desc" }],
    skip: (page - 1) * PE_PAGINA,
    take: PE_PAGINA,
  });
  const when = new Intl.DateTimeFormat("ro-RO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Bucharest",
  });

  const total = await prisma.auctionRequest.count();

  return (
    <div>
      <h1 className="font-display mb-2 text-3xl font-bold">Cereri licitație</h1>
      <p className="mb-6 text-sm text-ink/60">
        Crescătorii care au completat „Vreau să organizez o licitație” pe prima pagină. Sună-i, apoi
        apasă <em>Rezolvată</em>.
      </p>

      {requests.length === 0 ? (
        <p className="text-ink/50" data-testid="no-auction-requests">
          Nicio cerere deocamdată.
        </p>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <div
              key={r.id}
              data-testid="auction-request-row"
              className={`flex flex-wrap items-start justify-between gap-4 rounded-2xl border bg-white p-5 ${
                r.handledAt ? "border-ink/10 opacity-60" : "border-wing-orange/40"
              }`}
            >
              <div className="min-w-0 text-sm">
                <p className="font-display text-lg font-bold">{r.name}</p>
                <p className="mt-1">
                  <a href={`tel:${r.phone.replace(/\s/g, "")}`} className="font-semibold text-wing-blue">
                    ☎ {r.phone}
                  </a>
                  {" · "}
                  <a href={`mailto:${r.email}`} className="text-wing-blue">
                    ✉ {r.email}
                  </a>
                </p>
                <p className="mt-1 text-ink/70">⌂ {r.place}</p>
                <p className="mt-1 text-xs text-ink/50">
                  {when.format(r.createdAt)} · limba site-ului: {r.locale}
                  {r.handledAt && ` · rezolvată ${when.format(r.handledAt)}`}
                </p>
              </div>
              <RequestHandledButton id={r.id} handled={r.handledAt !== null} />
              <RowActions
                testid="request-row"
                remove={{
                  url: `/api/admin/auction-requests/${r.id}`,
                  confirm: `Ștergi cererea de la ${r.name} (${r.email})? Nu se poate da înapoi.`,
                }}
              />
            </div>
          ))}
        </div>
      )}

      <Pager page={page} total={total} perPage={PE_PAGINA} label="cereri" />
    </div>
  );
}
