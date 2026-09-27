import { formatMoney } from "./money";
import { emailTranslator } from "./messages";
import { intlLocale } from "./locales";

/**
 * E-mailul „ai fost depășit".
 *
 * Cererea clientului: omul care licitează la mai mulți porumbei deodată trebuie
 * să afle din mesaj LA CARE a fost depășit — nume, serie, lot — și să ajungă cu
 * un clic exact acolo. Pe lângă asta, tot ce îi trebuie ca să decidă: cât e
 * prețul acum, până la cât licitase el, cât ar trebui ca să reia conducerea și
 * când se închide.
 *
 * Pur: primește date, întoarce text.
 */

export type OutbidData = {
  locale: string;
  pigeon: string;
  ring: string | null;
  /** „1.04", dacă porumbelul e într-un lot */
  lotLabel: string | null;
  /** titlul licitației crescătorului, în limba omului */
  sale: string | null;
  currency: string;
  priceCents: number;
  /** până la cât licitase el (plafonul lui, nu al altcuiva) */
  yourMaxCents: number;
  /** cât trebuie ca să reia conducerea */
  minNextCents: number;
  endsAt: Date;
  url: string;
};

/** Numele cum apare în mesaj: „BIBI (RO-25-123456)" sau doar „BIBI". */
function numePorumbel(p: OutbidData): string {
  const ring = p.ring?.trim();
  return ring ? `${p.pigeon} (${ring})` : p.pigeon;
}

export function outbidSubject(p: OutbidData): string {
  const t = emailTranslator(p.locale);
  return p.lotLabel
    ? t("outbid.subject", { pigeon: p.pigeon, lot: p.lotLabel })
    : t("outbid.subjectNoLot", { pigeon: p.pigeon });
}

export function outbidText(p: OutbidData): string {
  const t = emailTranslator(p.locale);
  const bani = (cents: number) => formatMoney(cents, p.currency, p.locale);
  // ora platformei, aceeași pentru toți: cronometrul de pe site merge după ea
  const cand = new Intl.DateTimeFormat(intlLocale(p.locale), {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Bucharest",
  }).format(p.endsAt);

  const l: string[] = [t("hello"), ""];
  const nume = numePorumbel(p);
  if (p.lotLabel && p.sale) {
    l.push(t("outbid.intro", { pigeon: nume, lot: p.lotLabel, sale: p.sale }));
  } else if (p.lotLabel) {
    l.push(t("outbid.introLot", { pigeon: nume, lot: p.lotLabel }));
  } else {
    l.push(t("outbid.introNoLot", { pigeon: nume }));
  }
  l.push("");
  l.push(t("outbid.price", { amount: bani(p.priceCents) }));
  if (p.yourMaxCents > 0) l.push(t("outbid.yours", { amount: bani(p.yourMaxCents) }));
  l.push(t("outbid.next", { amount: bani(p.minNextCents) }));
  l.push(t("outbid.endsAt", { when: cand }));
  l.push("", t("outbid.link", { link: p.url }));
  return l.join("\n");
}
