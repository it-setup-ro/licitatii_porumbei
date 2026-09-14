import type { Transporter } from "nodemailer";
import { prisma } from "./db";

/**
 * Trimiterea e-mailurilor.
 *
 * Fiecare mesaj se scrie întâi în jurnalul de e-mailuri (Administrare →
 * E-mailuri), de unde se poate citi chiar dacă n-a plecat.
 *
 * Dacă e configurat un server SMTP, mesajul pleacă și pe e-mail. SMTP e
 * limba comună a tuturor furnizorilor — Brevo, Amazon SES, Mailgun, contul de
 * e-mail al firmei —, deci alegerea furnizorului nu cere nicio schimbare de cod:
 *
 *   SMTP_URL=smtps://utilizator:parola@smtp-relay.brevo.com:465
 *   SMTP_FROM="No.1 & Best Pigeons <licitatii@domeniu.ro>"
 */

export type OutgoingEmail = { to: string; subject: string; text: string };

const g = globalThis as unknown as { __mailer?: { url: string; transport: Transporter } };

async function transportFor(url: string): Promise<Transporter> {
  if (g.__mailer && g.__mailer.url === url) return g.__mailer.transport;
  const nodemailer = await import("nodemailer");
  const transport = nodemailer.createTransport(url);
  g.__mailer = { url, transport };
  return transport;
}

export async function sendEmail(msg: OutgoingEmail): Promise<{ sent: boolean }> {
  await prisma.emailLog.create({
    data: { toEmail: msg.to, subject: msg.subject, body: msg.text },
  });

  const url = process.env.SMTP_URL;
  if (!url) {
    if (process.env.NODE_ENV === "development") console.log(`[email -> ${msg.to}] ${msg.subject}`);
    return { sent: false };
  }

  try {
    const transport = await transportFor(url);
    await transport.sendMail({
      from: process.env.SMTP_FROM ?? "No.1 & Best Pigeons <no-reply@localhost>",
      to: msg.to,
      subject: msg.subject,
      text: msg.text,
    });
    return { sent: true };
  } catch (e) {
    // un e-mail care nu pleacă nu trebuie să oprească o licitație sau o închidere
    console.error("[email]", msg.to, msg.subject, e);
    return { sent: false };
  }
}
