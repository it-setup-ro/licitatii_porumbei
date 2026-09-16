import { formatMoney } from "./money";
import { equivalentLabel } from "./fx-math";
import { emailTranslator } from "./messages";

/**
 * Textul cu datele de plată, pentru câștigător (e-mail), în limba contului.
 *
 * Clientul: „Plata se face în contul firmei sau cash și nu trebuie legată de
 * site. Omul primește porumbeii după ce îi achită." Fără IBAN completat în
 * Setări, omul află că datele îi vin de la administrator — nu primește un cont gol.
 */

export type PaymentDetails = { companyName: string; iban: string; bank: string; phone: string };

export function paymentInstructionsText(p: {
  locale: string;
  /** true = a câștigat licitația; false = a cumpărat la preț fix */
  won: boolean;
  pigeon: string;
  label: string | null;
  ring: string;
  amountCents: number;
  currency: string;
  eurRate: number | null;
  details: PaymentDetails;
  orderUrl: string;
}): string {
  const t = emailTranslator(p.locale);
  const amount = formatMoney(p.amountCents, p.currency, p.locale);
  const eq = p.eurRate ? equivalentLabel(p.amountCents, p.currency, p.locale, p.eurRate) : null;
  const ref = p.label ? `${t("lotLabel", { label: p.label })} ${p.pigeon}` : p.pigeon;
  const iban = p.details.iban.trim();
  const company = p.details.companyName.trim();
  const bank = p.details.bank.trim();
  const phone = p.details.phone.trim();

  const l: string[] = [t("hello"), ""];
  l.push(t(p.won ? "payment.won" : "payment.bought", { pigeon: ref, ring: p.ring }));
  l.push("", t("payment.amount", { amount: eq ? `${amount} (${eq})` : amount }), "");

  if (iban) {
    l.push(t("payment.transferIntro"));
    if (company) l.push(`  ${t("payment.beneficiary", { value: company })}`);
    l.push(`  ${t("payment.iban", { value: iban })}`);
    if (bank) l.push(`  ${t("payment.bank", { value: bank })}`);
    l.push(`  ${t("payment.reference", { value: ref })}`);
  } else {
    l.push(t("payment.noIban"));
  }
  l.push(t("payment.cash"));
  l.push("", t("payment.rule"));
  if (phone) l.push(t("payment.phone", { phone }));
  l.push("", t("payment.order", { url: p.orderUrl }));
  return l.join("\n");
}
