import { formatMoney } from "./money";
import { emailTranslator } from "./messages";
import type { LotSums } from "./lot-summary";

/**
 * Cele două e-mailuri ale crescătorului, în limba contului lui.
 *
 * Propunerea acceptată de Daniel: nu un mesaj pe fiecare porumbel (un lot are
 * până la 20, s-ar închide toți în câteva minute și n-ar mai citi niciunul), ci
 * un rezumat când se încheie lotul și o confirmare când administratorul face
 * decontul — momentul în care banii pleacă spre el.
 *
 * Pur: primește date, întoarce text.
 */

export type LotRow = {
  pigeon: string;
  ring: string;
  priceCents: number;
  /** aliasul cumpărătorului; numele real nu apare până la plată */
  buyer: string | null;
};

export function lotClosedText(p: {
  locale: string;
  lotLabel: string;
  sale: string;
  currency: string;
  commissionPercent: number;
  sums: LotSums;
  rows: LotRow[];
  url: string;
}): string {
  const t = emailTranslator(p.locale);
  const bani = (cents: number) => formatMoney(cents, p.currency, p.locale);

  const l: string[] = [t("hello"), ""];
  l.push(t("breeder.lotIntro", { lot: p.lotLabel, sale: p.sale }), "");

  if (p.sums.sold === 0) {
    l.push(t("breeder.none"), "", t("breeder.seeAll", { link: p.url }));
    return l.join("\n");
  }

  l.push(t("breeder.sold", { count: p.sums.sold, total: p.sums.sold + p.sums.unsold }));
  l.push(t("breeder.total", { amount: bani(p.sums.totalCents) }));
  l.push(
    t("breeder.commission", {
      percent: p.commissionPercent,
      amount: bani(p.sums.commissionCents),
    })
  );
  l.push(t("breeder.payout", { amount: bani(p.sums.payoutCents) }));

  l.push("", t("breeder.listTitle"));
  for (const r of p.rows) {
    const cine = r.buyer ? ` — ${r.buyer}` : "";
    l.push(`  ${r.pigeon} (${r.ring}) — ${bani(r.priceCents)}${cine}`);
  }

  l.push("", t("breeder.lotFooter"), "", t("breeder.seeAll", { link: p.url }));
  return l.join("\n");
}

export function settlementText(p: {
  locale: string;
  sale: string;
  currency: string;
  count: number;
  totalCents: number;
  commissionCents: number;
  payoutCents: number;
  url: string;
}): string {
  const t = emailTranslator(p.locale);
  const bani = (cents: number) => formatMoney(cents, p.currency, p.locale);

  return [
    t("hello"),
    "",
    t("breeder.settlementIntro", { sale: p.sale }),
    "",
    t("breeder.settlementLine", {
      count: p.count,
      total: bani(p.totalCents),
      commission: bani(p.commissionCents),
    }),
    t("breeder.payout", { amount: bani(p.payoutCents) }),
    "",
    t("breeder.settlementFooter"),
    "",
    t("breeder.seeAll", { link: p.url }),
  ].join("\n");
}
