import { formatMoney } from "./money";
import { equivalentLabel } from "./fx-math";

/**
 * Textul cu datele de plată, pentru câștigător (e-mail).
 *
 * Clientul: „Plata se face în contul firmei sau cash și nu trebuie legată de
 * site. Omul primește porumbeii după ce îi achită." Fără IBAN completat în
 * Setări, omul află că datele îi vin de la administrator — nu primește un cont gol.
 */

export type PaymentDetails = { companyName: string; iban: string; bank: string; phone: string };

export function paymentInstructionsText(p: {
  locale: "ro" | "en";
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
  const ro = p.locale === "ro";
  const amount = formatMoney(p.amountCents, p.currency, p.locale);
  const eq = p.eurRate ? equivalentLabel(p.amountCents, p.currency, p.locale, p.eurRate) : null;
  const ref = p.label ? `${ro ? "Lotul" : "Lot"} ${p.label} ${p.pigeon}` : p.pigeon;
  const iban = p.details.iban.trim();
  const company = p.details.companyName.trim();
  const bank = p.details.bank.trim();
  const phone = p.details.phone.trim();

  const l: string[] = [ro ? "Bună ziua," : "Hello,", ""];
  l.push(
    p.won
      ? ro
        ? `Felicitări! Ai câștigat porumbelul ${ref} (serie ${p.ring}).`
        : `Congratulations! You won the pigeon ${ref} (ring ${p.ring}).`
      : ro
        ? `Ai cumpărat porumbelul ${ref} (serie ${p.ring}) la preț fix.`
        : `You bought the pigeon ${ref} (ring ${p.ring}) at a fixed price.`
  );
  l.push("", `${ro ? "Suma de plată" : "Amount to pay"}: ${amount}${eq ? ` (${eq})` : ""}`, "");

  if (iban) {
    l.push(
      ro
        ? "Cum plătești — prin transfer bancar în contul firmei:"
        : "How to pay — by bank transfer to the company account:"
    );
    if (company) l.push(`  ${ro ? "Beneficiar" : "Beneficiary"}: ${company}`);
    l.push(`  IBAN: ${iban}`);
    if (bank) l.push(`  ${ro ? "Banca" : "Bank"}: ${bank}`);
    l.push(`  ${ro ? "La detalii plată scrie" : "Payment reference"}: ${ref}`);
  } else {
    l.push(
      ro
        ? "Datele contului pentru transfer îți vor fi trimise de administrator."
        : "The account details for the transfer will be sent to you by the administrator."
    );
  }
  l.push(
    ro
      ? "Se poate plăti și numerar, la predarea porumbelului."
      : "You can also pay in cash when the pigeon is handed over."
  );
  l.push("", ro ? "Porumbeii se predau după plată." : "Pigeons are handed over after payment.");
  if (phone) l.push(ro ? `Pentru orice întrebare: ${phone}` : `For any questions: ${phone}`);
  l.push("", `${ro ? "Comanda ta" : "Your order"}: ${p.orderUrl}`);
  return l.join("\n");
}
