import { setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import SettlementSection from "@/components/admin/SettlementSection";

export const dynamic = "force-dynamic";

/**
 * Deconturile cu crescătorii: câte unul pentru fiecare licitație de crescător
 * cu vânzări și, la preț fix, câte unul pentru fiecare nume de la „Oferit de".
 */
export default async function AdminSettlementsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const settings = await getSettings();

  const [sales, fixedOrders] = await Promise.all([
    prisma.sale.findMany({
      where: { lots: { some: { auctions: { some: { order: { isNot: null } } } } } },
      include: { breeder: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.order.findMany({
      where: { status: { not: "CANCELLED" }, auction: { is: { saleMode: "FIXED" } } },
      select: { auction: { select: { pigeon: { select: { offeredBy: true } } } } },
    }),
  ]);
  const offeredBy = [...new Set(fixedOrders.map((o) => o.auction.pigeon.offeredBy ?? ""))].sort();

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">Deconturi</h1>
      <p className="mt-1 max-w-3xl text-sm text-ink/60">
        În decont intră doar porumbeii plătiți; cei încă neplătiți apar separat. „Marchează decontat”
        închide suma de plătit crescătorului, iar porumbeii plătiți mai târziu intră în decontul
        următor.
      </p>

      {sales.length === 0 && offeredBy.length === 0 && (
        <p className="mt-10 text-ink/50" data-testid="settlements-empty">
          Încă nu există vânzări.
        </p>
      )}

      {sales.map((s) => (
        <SettlementSection
          key={s.id}
          group={{ saleId: s.id }}
          title={`${s.titleRo} — ${s.breeder.name}`}
          subtitle={`Comisionul licitației: ${s.commissionPercent}%`}
          currency={settings.platformCurrency}
        />
      ))}

      {offeredBy.map((n) => (
        <SettlementSection
          key={`fix-${n}`}
          group={{ offeredBy: n }}
          title={`Preț fix — ${n || "fără „Oferit de”"}`}
          subtitle={`Comisionul din Setări, de la data cumpărării (acum ${settings.commissionPercent}%)`}
          currency={settings.platformCurrency}
        />
      ))}
    </div>
  );
}
