import { prisma } from "./db";
import { getSettings } from "./settings";
import { sendEmail } from "./mailer";

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
  | "LOTS_ENDING_BIDDER";

const EMAIL_SUBJECTS: Record<NotifyType, { ro: string; en: string }> = {
  OUTBID: { ro: "Oferta ta a fost depășită", en: "You have been outbid" },
  AUCTION_ENDING: { ro: "Licitația se închide curând", en: "Auction ending soon" },
  AUCTION_WON: { ro: "Felicitări! Ai câștigat licitația", en: "Congratulations! You won the auction" },
  AUCTION_LOST: { ro: "Licitația s-a încheiat", en: "The auction has ended" },
  SELLER_SOLD: { ro: "Porumbelul tău s-a vândut", en: "Your pigeon has sold" },
  LOT_APPROVED: { ro: "Lotul tău a fost aprobat", en: "Your lot has been approved" },
  LOT_REJECTED: { ro: "Lotul tău a fost respins", en: "Your lot has been rejected" },
  ORDER_PAID: { ro: "Plata a fost confirmată", en: "Payment confirmed" },
  SELLER_APPROVED: { ro: "Contul de vânzător a fost aprobat", en: "Seller account approved" },
  SELLER_REJECTED: { ro: "Contul de vânzător a fost respins", en: "Seller account rejected" },
  REVIEW_RECEIVED: { ro: "Ai primit o recenzie nouă", en: "You received a new review" },
  RESERVE_NOT_MET: {
    ro: "Licitația s-a încheiat sub prețul de rezervă",
    en: "The auction ended below the reserve price",
  },
  LOTS_ENDING: {
    ro: "Se încheie o licitație în curând",
    en: "An auction is ending soon",
  },
  LOTS_ENDING_BIDDER: {
    ro: "Porumbeii pe care ai licitat se închid în curând",
    en: "The pigeons you bid on are closing soon",
  },
  ACCOUNT_APPROVED: {
    ro: "Contul tău a fost aprobat — poți licita",
    en: "Your account has been approved — you can bid",
  },
  ACCOUNT_REJECTED: {
    ro: "Contul tău nu a fost aprobat pentru licitare",
    en: "Your account was not approved for bidding",
  },
  LOT_EDITED_BY_ADMIN: {
    ro: "Un lot al tău a fost corectat de administrator",
    en: "One of your lots was corrected by an administrator",
  },
};

export async function notify(
  userId: string,
  type: NotifyType,
  params: Record<string, string | number>,
  link?: string
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  await prisma.notification.create({
    data: { userId, type, paramsJson: JSON.stringify(params), link },
  });

  const settings = await getSettings();
  if (settings.emailEnabled) {
    const locale = user.locale === "en" ? "en" : "ro";
    const subject = EMAIL_SUBJECTS[type][locale];
    const body =
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
