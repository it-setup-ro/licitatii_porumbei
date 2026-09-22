import { setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import AuctionVisibility from "@/components/admin/AuctionVisibility";

export const dynamic = "force-dynamic";

/**
 * Porumbeii puși la preț fix.
 *
 * Până acum nu aveau niciun loc în administrare: se puneau din „Vinde" și erau
 * de găsit doar pe site. Clientul a cerut să-i poată ascunde sau șterge, deci
 * aici sunt toți, cu starea lor.
 */

const STARE: Record<string, string> = {
  LIVE: "De vânzare",
  CLOSED: "Vândut",
  SCHEDULED: "Programat",
  DRAFT: "Ciornă",
  PENDING_APPROVAL: "Așteaptă aprobare",
  REJECTED: "Respins",
  CANCELLED: "Anulat",
};

export default async function AdminFixedPricePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const auctions = await prisma.auction.findMany({
    where: { saleMode: "FIXED" },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      pigeon: {
        select: {
          name: true,
          ringNumber: true,
          offeredBy: true,
          media: { where: { type: "IMAGE" }, orderBy: { sortIdx: "asc" }, take: 1 },
        },
      },
      order: { select: { id: true, status: true } },
      _count: { select: { bids: true } },
    },
    take: 200,
  });

  const dateFmt = new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium", timeZone: "Europe/Bucharest" });

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">Preț fix</h1>
      <p className="mt-1 max-w-3xl text-sm text-ink/60">
        Porumbeii de cumpărat direct, fără licitație. „Ascunde de pe site” îi scoate din listele
        publice și din căutare, dar rămân aici. „Șterge” merge doar cât n-au comandă: un porumbel
        cumpărat rămâne, ca să nu dispară urma vânzării.
      </p>

      {auctions.length === 0 ? (
        <p className="mt-6 text-ink/50" data-testid="no-fixed">
          Niciun porumbel la preț fix.
        </p>
      ) : (
        <div className="mt-6 space-y-3">
          {auctions.map((a) => (
            <div
              key={a.id}
              data-testid="fixed-row"
              className={`flex flex-wrap items-center gap-4 rounded-2xl border bg-white p-4 ${
                a.hiddenAt ? "border-wing-orange/40 opacity-70" : "border-ink/10"
              }`}
            >
              <div className="h-16 w-20 shrink-0 overflow-hidden rounded-xl bg-ivory-soft">
                {a.pigeon.media[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={a.pigeon.media[0].url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                )}
              </div>

              <div className="min-w-0 flex-1 text-sm">
                <a
                  href={`/${locale}/auctions/${a.id}`}
                  className="font-display text-lg font-bold text-wing-blue hover:underline"
                >
                  {a.pigeon.name}
                </a>
                <p className="text-ink/60">
                  {a.pigeon.ringNumber}
                  {a.pigeon.offeredBy ? ` · oferit de ${a.pigeon.offeredBy}` : ""}
                </p>
                <p className="mt-1 text-xs uppercase tracking-wide text-ink/50">
                  {STARE[a.status] ?? a.status} · {formatMoney(a.startPriceCents, a.currency, "ro")}
                  {a.order ? " · are comandă" : ""}
                  {a._count.bids > 0 ? ` · ${a._count.bids} oferte` : ""}
                  {" · "}
                  {dateFmt.format(a.createdAt)}
                </p>
              </div>

              <AuctionVisibility
                auctionId={a.id}
                hidden={a.hiddenAt !== null}
                name={a.pigeon.name}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
