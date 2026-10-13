import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { normalizeSearch, DIACRITICE_DIN, DIACRITICE_IN } from "@/lib/search";
import SaleCard from "@/components/SaleCard";
import AuctionCard from "@/components/AuctionCard";
import { cardInclude, toCardData, type AuctionWithCard } from "@/lib/queries";
import { getSaleCards } from "@/lib/sale-cards";

export const dynamic = "force-dynamic";

/**
 * Licitațiile crescătorilor.
 *
 * Clientul: „când intru pe licitații să apară doar intrările spre licitații
 * CRESCĂTOR (foto cu licitațiile active). ATÂT, FĂRĂ PORUMBEI! Doar după ce dau
 * click pe licitația unui crescător îmi arată lotul sau loturile cu porumbei."
 *
 * Căutarea rămâne după porumbel — e felul în care caută omul — dar răspunsul e
 * licitația în care se află, nu porumbelul scos din context.
 */
export default async function AuctionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auction");
  const ts = await getTranslations("sales");
  const tc = await getTranslations("common");
  const sp = await searchParams;

  const status = (["LIVE", "SCHEDULED", "CLOSED"].includes(sp.status ?? "")
    ? sp.status!
    : "LIVE") as "LIVE" | "SCHEDULED" | "CLOSED";
  const q = (sp.q ?? "").trim();

  let carduri = await getSaleCards(status);

  /*
    Căutarea, în doi pași.

    Întâi aflăm ce porumbei se potrivesc, cu o interogare care aduce numele,
    seria, linia și rubrica la litere mici fără diacritice — de partea bazei,
    nu doar de partea omului. Fără asta, „cuca lui nita" nu găsește
    „CUCA lui NIȚĂ": baza compară exact, iar „ț" nu e „t".

    Apoi păstrăm licitațiile care îi conțin: omul caută un porumbel, dar
    aterizează în licitația crescătorului, de unde vede tot lotul.
  */
  let potriviriPeStare: Record<string, number> = {};
  let porumbei: AuctionWithCard[] = [];
  if (q) {
    const termen = `%${normalizeSearch(q)}%`;
    const randuri = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Pigeon"
      WHERE lower(translate(
              coalesce(name, '') || ' ' || coalesce("ringNumber", '') || ' ' ||
              coalesce(strain, '') || ' ' || coalesce("taglineRo", '') || ' ' ||
              coalesce("taglineEn", '') || ' ' || coalesce("bredBy", '') || ' ' ||
              coalesce("offeredBy", ''),
              ${DIACRITICE_DIN}, ${DIACRITICE_IN})) LIKE ${termen}
      LIMIT 500`;
    const pigeonIds = randuri.map((r) => r.id);

    const sloganuri = await prisma.sale.findMany({
      where: {
        archivedAt: null,
        lots: { some: { auctions: { some: { pigeonId: { in: pigeonIds }, hiddenAt: null } } } },
      },
      select: { slug: true, lots: { select: { status: true } } },
    });
    // câte potriviri sunt în celelalte file — altfel omul vede „niciun rezultat"
    // deși porumbelul lui e la „Închise" sau la „În curând"
    const peStare = await prisma.auction.groupBy({
      by: ["status"],
      where: { pigeonId: { in: pigeonIds }, saleMode: "AUCTION", hiddenAt: null },
      _count: { _all: true },
    });
    potriviriPeStare = Object.fromEntries(peStare.map((r) => [r.status, r._count._all]));

    const gasite = new Set(sloganuri.map((s) => s.slug));
    carduri = carduri.filter((c) => gasite.has(c.slug));

    // Cine caută un porumbel anume vrea să-l vadă, nu doar licitația lui. Fără
    // căutare, lista rămâne curată: numai licitațiile crescătorilor.
    porumbei = await prisma.auction.findMany({
      where: { status, saleMode: "AUCTION", hiddenAt: null, pigeonId: { in: pigeonIds } },
      include: cardInclude,
      orderBy: status === "CLOSED" ? { closedAt: "desc" } : { endsAt: "asc" },
      take: 30,
    });
  }

  const tabs = [
    { key: "LIVE", label: t("statusLive") },
    { key: "SCHEDULED", label: t("statusScheduled") },
    { key: "CLOSED", label: t("statusClosed") },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-3xl font-bold">{ts("sectionTitle")}</h1>
      <p className="mb-6 mt-1 text-sm text-ink/60">{ts("sectionIntro")}</p>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-full border border-ink/15 p-1">
          {tabs.map((tab) => (
            <a
              key={tab.key}
              href={`?status=${tab.key}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              data-testid={`tab-${tab.key.toLowerCase()}`}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
                status === tab.key ? "bg-ink text-ivory" : "hover:bg-ink/5"
              }`}
            >
              {tab.label}
            </a>
          ))}
        </div>
        <form className="ms-auto" method="get">
          <input type="hidden" name="status" value={status} />
          <input
            name="q"
            defaultValue={q}
            placeholder={tc("search")}
            data-testid="search-input"
            className="w-56 rounded-full border border-ink/15 bg-white px-4 py-2 text-sm outline-none focus:border-wing-blue"
          />
        </form>
      </div>

      {carduri.length === 0 && porumbei.length === 0 ? (
        <div className="py-16 text-center" data-testid="no-results">
          <p className="text-ink/60">{q ? t("noSearchResults", { q }) : tc("none")}</p>
          {/* Porumbelul căutat poate fi într-o altă filă. În loc să-l lăsăm pe om
              să încerce filele pe rând, îi spunem unde e și îl ducem acolo. */}
          {q &&
            tabs
              .filter((tab) => tab.key !== status && (potriviriPeStare[tab.key] ?? 0) > 0)
              .map((tab) => (
                <p key={tab.key} className="mt-3">
                  <a
                    href={`?status=${tab.key}&q=${encodeURIComponent(q)}`}
                    data-testid="search-other-tab"
                    className="font-semibold text-wing-blue hover:underline"
                  >
                    {t("foundInTab", { count: potriviriPeStare[tab.key] ?? 0, tab: tab.label })} →
                  </a>
                </p>
              ))}
        </div>
      ) : (
        <>
          {carduri.length > 0 && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" data-testid="sales-section">
              {carduri.map((c) => (
                <SaleCard key={c.slug} sale={c} />
              ))}
            </div>
          )}
          {porumbei.length > 0 && (
            <div className="mt-10">
              <h2 className="font-display mb-4 text-xl font-bold">{t("searchPigeons")}</h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {porumbei.map((a) => (
                  <AuctionCard key={a.id} auction={toCardData(a)} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
