import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { cardInclude, toCardData } from "@/lib/queries";
import { normalizeSearch, DIACRITICE_DIN, DIACRITICE_IN } from "@/lib/search";
import AuctionCard from "@/components/AuctionCard";
import LotCard from "@/components/LotCard";
import { getLotCards } from "@/lib/lot-cards";

export const dynamic = "force-dynamic";

export default async function AuctionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; q?: string; sort?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auction");
  const tc = await getTranslations("common");
  const sp = await searchParams;

  const status = ["LIVE", "SCHEDULED", "CLOSED"].includes(sp.status ?? "")
    ? sp.status!
    : "LIVE";
  const q = (sp.q ?? "").trim();

  /*
    Cautarea, in doi pasi.

    Intai aflam ce porumbei se potrivesc, cu o interogare care aduce numele,
    seria, linia si rubrica la litere mici fara diacritice — de partea bazei,
    nu doar de partea omului. Fara asta, „cuca lui nita" nu gaseste
    „CUCA lui NIȚĂ": baza compara exact, iar „ț" nu e „t".

    Apoi filtram licitatiile dupa acei porumbei, cu restul conditiilor
    obisnuite. Doi pasi, dar fiecare simplu — si nu pierdem sortarea si
    datele de card pe care le stie deja Prisma.
  */
  let pigeonIds: string[] | null = null;
  let potriviriPeStare: Record<string, number> = {};
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
    pigeonIds = randuri.map((r) => r.id);

    // cate potriviri sunt in celelalte file — altfel omul vede „niciun rezultat"
    // desi porumbelul lui e la „Închise" sau la „În curând"
    const peStare = await prisma.auction.groupBy({
      by: ["status"],
      where: { pigeonId: { in: pigeonIds }, saleMode: "AUCTION" },
      _count: { _all: true },
    });
    potriviriPeStare = Object.fromEntries(peStare.map((r) => [r.status, r._count._all]));
  }

  const auctions = await prisma.auction.findMany({
    where: {
      status,
      // porumbeii cu preț fix au pagina lor, „Preț fix"
      saleMode: "AUCTION",
      // scoși de pe site de administrator
      hiddenAt: null,
      ...(pigeonIds ? { pigeonId: { in: pigeonIds } } : {}),
    },
    include: cardInclude,
    orderBy:
      sp.sort === "price"
        ? { currentPriceCents: "desc" }
        : status === "CLOSED"
          ? { closedAt: "desc" }
          : { endsAt: "asc" },
    take: 60,
  });

  // Loturile crescătorilor din fila curentă, deasupra porumbeilor — câte un card
  // pe lot, cu datele lui. La căutare nu se arată: omul caută un porumbel anume.
  const ts = await getTranslations("sales");
  const lotCards = q ? [] : await getLotCards(status as "LIVE" | "SCHEDULED" | "CLOSED");

  const tabs = [
    { key: "LIVE", label: t("statusLive") },
    { key: "SCHEDULED", label: t("statusScheduled") },
    { key: "CLOSED", label: t("statusClosed") },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
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

      {lotCards.length > 0 && (
        <section className="mb-10" data-testid="sales-section">
          <h2 className="font-display text-2xl font-bold">{ts("sectionTitle")}</h2>
          <p className="mb-4 mt-1 text-sm text-ink/60">{ts("sectionIntro")}</p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {lotCards.map((l) => (
              <LotCard key={`${l.saleSlug}-${l.lotNumber}`} lot={l} />
            ))}
          </div>
        </section>
      )}

      {auctions.length === 0 ? (
        <div className="py-16 text-center" data-testid="no-results">
          <p className="text-ink/60">{q ? t("noSearchResults", { q }) : tc("none")}</p>
          {/* Porumbelul cautat poate fi intr-o alta fila. In loc sa-l lasam pe om
              sa incerce filele pe rand, ii spunem unde e si il ducem acolo. */}
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
                    {t("foundInTab", {
                      count: potriviriPeStare[tab.key] ?? 0,
                      tab: tab.label,
                    })}{" "}
                    →
                  </a>
                </p>
              ))}
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {auctions.map((a) => (
            <AuctionCard key={a.id} auction={toCardData(a)} />
          ))}
        </div>
      )}
    </div>
  );
}
