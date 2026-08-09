import { prisma } from "./db";
import { getSettings } from "./settings";

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
  | "REVIEW_RECEIVED";

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
    await prisma.emailLog.create({ data: { toEmail: user.email, subject, body } });
    if (process.env.NODE_ENV === "development") {
      console.log(`[email -> ${user.email}] ${subject}`);
    }
  }
  // SMS: intentionat neimplementat la lansare — canalul primar e e-mail (D16).
  // Integrarea (Twilio/SMSLink) se ataseaza aici cand settings.smsEnabled devine true.
}
