import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { cardInclude, toCardData } from "@/lib/queries";
import AuctionCard from "@/components/AuctionCard";

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

  const auctions = await prisma.auction.findMany({
    where: {
      status,
      ...(q
        ? {
            pigeon: {
              OR: [
                { titleRo: { contains: q } },
                { titleEn: { contains: q } },
                { ringNumber: { contains: q } },
                { strain: { contains: q } },
              ],
            },
          }
        : {}),
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
        <form className="ml-auto" method="get">
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

      {auctions.length === 0 ? (
        <p className="py-16 text-center text-ink/50">{tc("none")}</p>
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
