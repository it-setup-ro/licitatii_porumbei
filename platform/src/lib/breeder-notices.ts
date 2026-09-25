/**
 * Când îl anunțăm pe crescător, dacă are cont.
 *
 * Două momente, hotărâte cu Daniel: la închiderea lotului (un rezumat, nu un
 * mesaj pe porumbel) și la decont (atunci pleacă banii spre el). Bifa „vreau
 * e-mail" din Fișa mea îi oprește pe amândouă.
 *
 * Regula de bază, ca la anunțurile administratorului: un e-mail care nu pleacă
 * nu are voie să oprească sweeperul sau decontul. Totul se înghite și se scrie
 * în jurnal.
 */

import { prisma } from "./db";
import { notify } from "./notify";
import { lotSums } from "./lot-summary";
import { lotClosedText, settlementText, type LotRow } from "./breeder-emails";
import { buyerForBreeder } from "./breeder-view";
import { normalizeLocale, pick } from "./locales";

/** Adresa unei pagini a crescătorului, pentru linkul din e-mail. */
function link(locale: string, cale: string): string {
  const base = (process.env.SITE_URL ?? process.env.PUBLIC_BASE_URL ?? "").replace(/\/+$/, "");
  return base ? `${base}/${locale}${cale}` : cale;
}

/** Rezumatul lotului încheiat, către crescătorul cu cont. */
export async function notifyBreederLotClosed(lotId: string): Promise<void> {
  try {
    const lot = await prisma.lot.findUnique({
      where: { id: lotId },
      include: {
        sale: { include: { breeder: true } },
        auctions: {
          include: {
            pigeon: { select: { name: true, ringNumber: true } },
            order: {
              include: {
                buyer: {
                  select: {
                    name: true,
                    nickname: true,
                    addressCity: true,
                    addressCountry: true,
                  },
                },
              },
            },
          },
          orderBy: { lotPosition: "asc" },
        },
      },
    });
    const breeder = lot?.sale.breeder;
    if (!lot || !breeder?.userId || !breeder.notifyByEmail) return;

    const user = await prisma.user.findUnique({
      where: { id: breeder.userId },
      select: { locale: true },
    });
    const locale = normalizeLocale(user?.locale);
    const sums = lotSums(lot.auctions);
    const rows: LotRow[] = lot.auctions
      .filter((a) => a.order !== null)
      .map((a) => ({
        pigeon: a.pigeon.name,
        ring: a.pigeon.ringNumber,
        priceCents: a.order!.amountCents,
        // la închidere nimic nu e plătit încă, deci apare aliasul
        buyer: buyerForBreeder(a.order!).label,
      }));
    const moneda = lot.auctions[0]?.currency ?? "RON";

    await notify(
      breeder.userId,
      "LOT_CLOSED_BREEDER",
      {
        lot: String(lot.number),
        count: sums.sold,
        priceCents: sums.totalCents,
        currency: moneda,
      },
      "/breeder/sales",
      {
        emailText: lotClosedText({
          locale,
          lotLabel: String(lot.number),
          sale: pick(locale, lot.sale.titleRo, lot.sale.titleEn),
          currency: moneda,
          commissionPercent: lot.sale.commissionPercent,
          sums,
          rows,
          url: link(locale, "/breeder/sales"),
        }),
      }
    );
  } catch (e) {
    const mesaj = e instanceof Error ? e.message : String(e);
    console.error("[crescator] rezumatul lotului nu a plecat: " + mesaj);
  }
}

/** Confirmarea decontului, către crescătorul cu cont. */
export async function notifyBreederSettled(settlementId: string): Promise<void> {
  try {
    const s = await prisma.settlement.findUnique({ where: { id: settlementId } });
    if (!s?.saleId) return; // decontul de la preț fix nu e al unui crescător cu fișă
    const sale = await prisma.sale.findUnique({
      where: { id: s.saleId },
      include: { breeder: true },
    });
    const breeder = sale?.breeder;
    if (!sale || !breeder?.userId || !breeder.notifyByEmail) return;

    const user = await prisma.user.findUnique({
      where: { id: breeder.userId },
      select: { locale: true },
    });
    const locale = normalizeLocale(user?.locale);
    const titlu = pick(locale, sale.titleRo, sale.titleEn);

    await notify(
      breeder.userId,
      "SETTLEMENT_DONE",
      { lot: titlu, priceCents: s.payoutCents, currency: s.currency },
      "/breeder/settlement",
      {
        emailText: settlementText({
          locale,
          sale: titlu,
          currency: s.currency,
          count: s.orderCount,
          totalCents: s.totalCents,
          commissionCents: s.commissionCents,
          payoutCents: s.payoutCents,
          url: link(locale, "/breeder/settlement"),
        }),
      }
    );
  } catch (e) {
    const mesaj = e instanceof Error ? e.message : String(e);
    console.error("[crescator] confirmarea decontului nu a plecat: " + mesaj);
  }
}
