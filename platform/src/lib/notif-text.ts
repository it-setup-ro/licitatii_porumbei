/**
 * Textul unei notificări, pregătit o singură dată: îl folosesc și clopoțelul
 * din cont și e-mailul. Înainte, e-mailul înșira parametrii cum erau în baza de
 * date, așa că omul primea „priceCents: 170000" în loc de „1.700 lei".
 *
 * Pur, ca să poată fi verificat fără server și fără baza de date.
 */

import { formatMoney } from "./money";

export type NotifParams = Record<string, string | number>;

/** Sumele stau în bani (…Cents); șabloanele cer {price} scris pentru om. */
export function notifValues(
  params: NotifParams,
  currency: string,
  locale: string
): Record<string, string | number> {
  const values: Record<string, string | number> = { ...params };
  // o licitație în euro rămâne în euro, chiar dacă platforma socotește în lei
  const moneda =
    typeof params.currency === "string" && params.currency ? params.currency : currency;
  if (typeof params.priceCents === "number")
    values.price = formatMoney(params.priceCents, moneda, locale);
  if (typeof params.amountCents === "number")
    values.price = formatMoney(params.amountCents, moneda, locale);
  // un parametru lipsă nu are voie să lase notificarea fără text
  values.lot = String(params.lot ?? "");
  values.reason = String(params.reason ?? "");
  values.titlu = String(params.titlu ?? "");
  values.rating = params.rating ?? "";
  return values;
}

/**
 * Linkul din e-mail trebuie să fie apăsabil, deci adresă întreagă și cu limba
 * contului („…/ro/auctions/…"). În baza de date linkul e relativ, ca să meargă
 * și pe site, oricare ar fi limba cererii.
 */
export function absoluteLink(
  base: string | null | undefined,
  locale: string,
  link: string | null | undefined
): string | null {
  if (!link) return null;
  if (/^https?:\/\//i.test(link)) return link;
  const curat = (base ?? "").trim().replace(/\/+$/, "");
  if (!curat) return null;
  return `${curat}/${locale}${link.startsWith("/") ? link : `/${link}`}`;
}
