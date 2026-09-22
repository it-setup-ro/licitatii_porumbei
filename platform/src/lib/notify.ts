import { prisma } from "./db";
import { getSettings } from "./settings";
import { sendEmail } from "./mailer";
import { emailTranslator } from "./messages";

/**
 * Notificari in-app + e-mail. In dev, e-mailul se scrie in EmailLog (si consola)
 * — testele e2e verifica EmailLog. SMS: pregatit, dezactivat (client-decisions D16).
 */

export type NotifyType =
  | "OUTBID"
  | "AUCTION_ENDING"
  | "AUCTION_WON"
  | "AUCTION_LOST"
  | "SELLER_SOLD"
  | "LOT_APPROVED"
  | "LOT_REJECTED"
  | "ORDER_PAID"
  | "SELLER_APPROVED"
  | "SELLER_REJECTED"
  | "REVIEW_RECEIVED"
  | "LOT_EDITED_BY_ADMIN"
  | "RESERVE_NOT_MET"
  | "ACCOUNT_APPROVED"
  | "ACCOUNT_REJECTED"
  | "LOTS_ENDING"
  | "LOTS_ENDING_BIDDER"
  | "PIGEON_UNAVAILABLE"
  | "PAYMENT_INSTRUCTIONS"
  | "ORDER_CANCELLED"
  | "AUCTION_WITHDRAWN";


export async function notify(
  userId: string,
  type: NotifyType,
  params: Record<string, string | number>,
  link?: string,
  /** textul e-mailului, când lista de parametri nu ajunge (ex. datele de plată) */
  opts: { emailText?: string } = {}
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  await prisma.notification.create({
    data: { userId, type, paramsJson: JSON.stringify(params), link },
  });

  const settings = await getSettings();
  if (settings.emailEnabled) {
    // subiectul în limba contului (email.subjects din messages/<limbă>.json)
    const subject = emailTranslator(user.locale)(`subjects.${type}`);
    const body =
      opts.emailText ??
      `${subject}\n\n` +
      Object.entries(params)
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n") +
      (link ? `\n\n${link}` : "");
    await sendEmail({ to: user.email, subject, text: body });
  }
  // SMS: intentionat neimplementat la lansare — canalul primar e e-mail (D16).
  // Integrarea (Twilio/SMSLink) se ataseaza aici cand settings.smsEnabled devine true.
}
