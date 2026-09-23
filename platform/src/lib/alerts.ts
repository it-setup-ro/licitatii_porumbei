/**
 * Anunțuri pentru administrator.
 *
 * Până acum, o cerere de cont nou sau un mesaj prin formularul de contact se
 * vedeau doar dacă adminul intra pe site: pe server așteptau două conturi
 * neaprobate și un mesaj necitit, fără ca cineva să fi fost anunțat. Aici e
 * locul unic prin care pleacă vestea — pe e-mail și pe Telegram, către cine e
 * trecut în Administrare → Anunțuri.
 *
 * Regula de bază: un anunț care nu pleacă nu are voie să strice ce făcea omul.
 * Toate erorile se înghit și se scriu în jurnal.
 */

import { prisma } from "./db";
import { sendEmail } from "./mailer";
import { telegramConfigured, telegramSend } from "./telegram";

/** Ce se întâmplă pe site și merită scos în față. Cheile ajung în baza de date. */
export const ALERT_EVENTS = {
  ACCOUNT_PENDING: "Cerere de cont nou",
  CONTACT_MESSAGE: "Mesaj prin formularul de contact",
  PIGEON_PENDING: "Porumbel trimis spre aprobare",
  AUCTION_REQUEST: "Cerere de organizare a unei licitații",
  SHOP_ORDER: "Comandă nouă în magazin",
  AUCTION_ORDER: "Licitație închisă cu câștigător",
  ARTICLE_PROPOSAL: "Articol propus de un crescător",
} as const;

export type AlertEvent = keyof typeof ALERT_EVENTS;

export const ALERT_EVENT_KEYS = Object.keys(ALERT_EVENTS) as AlertEvent[];

export function isAlertEvent(x: unknown): x is AlertEvent {
  return typeof x === "string" && x in ALERT_EVENTS;
}

/** Lista de evenimente a unui destinatar. Ce nu se înțelege = toate. */
export function parseEvents(json: string | null | undefined): AlertEvent[] {
  if (!json) return [...ALERT_EVENT_KEYS];
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [...ALERT_EVENT_KEYS];
    const curate = parsed.filter(isAlertEvent);
    return curate.length > 0 ? curate : [];
  } catch {
    return [...ALERT_EVENT_KEYS];
  }
}

export type AlertData = {
  /** prima linie, scurtă: „Cerere de cont nou — Ion Popescu" */
  titlu: string;
  /** rândurile de detaliu, în ordinea în care se citesc */
  linii?: string[];
  /** unde se rezolvă, ca drum în site: „/ro/admin/accounts" */
  cale?: string;
};

/** Adresa site-ului, ca linkurile din Telegram să fie apăsabile. */
export function siteUrl(): string | null {
  const raw = process.env.SITE_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/+$/, "");
}

/** Textul unui anunț. Pur, ca să poată fi verificat fără server. */
export function formatAlert(
  event: AlertEvent,
  data: AlertData,
  baza: string | null = siteUrl()
): { subject: string; text: string } {
  const link = data.cale ? (baza ? baza + data.cale : data.cale) : null;
  const text = [
    `${ALERT_EVENTS[event]}: ${data.titlu}`,
    ...(data.linii && data.linii.length > 0 ? ["", ...data.linii] : []),
    ...(link ? ["", link] : []),
  ].join("\n");
  return { subject: `${ALERT_EVENTS[event]}: ${data.titlu}`, text };
}

/**
 * Trimite anunțul către toți cei abonați la evenimentul ăsta.
 * Nu aruncă niciodată: dacă Telegram e picat, omul tot își vede treaba făcută.
 */
export async function alertAdmin(event: AlertEvent, data: AlertData): Promise<void> {
  try {
    const destinatari = await prisma.alertRecipient.findMany({ where: { active: true } });
    if (destinatari.length === 0) return;

    const { subject, text } = formatAlert(event, data);

    for (const d of destinatari) {
      if (!parseEvents(d.events).includes(event)) continue;
      try {
        if (d.kind === "EMAIL" && d.email) {
          await sendEmail({ to: d.email, subject, text });
        } else if (d.kind === "TELEGRAM" && d.chatId && telegramConfigured()) {
          await telegramSend(d.chatId, text);
        } else {
          continue;
        }
        await prisma.alertRecipient.update({
          where: { id: d.id },
          data: { lastSentAt: new Date(), lastError: null },
        });
      } catch (e) {
        // un destinatar stricat (a blocat botul, adresă greșită) nu-i oprește pe ceilalți
        const mesaj = e instanceof Error ? e.message.slice(0, 300) : "eroare necunoscută";
        console.error("[anunțuri]", d.kind, d.label, mesaj);
        await prisma.alertRecipient
          .update({ where: { id: d.id }, data: { lastError: mesaj } })
          .catch(() => {});
      }
    }
  } catch (e) {
    console.error("[anunțuri]", e);
  }
}

/** Cod scurt pentru linkul de invitație: fără caractere care se confundă. */
export function newInviteCode(): string {
  const litere = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let cod = "";
  for (let i = 0; i < 8; i++) cod += litere[Math.floor(Math.random() * litere.length)];
  return cod;
}
