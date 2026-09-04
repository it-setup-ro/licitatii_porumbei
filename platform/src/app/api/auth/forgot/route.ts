import { z } from "zod";
import { prisma } from "@/lib/db";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { newResetToken, resetExpiry, resetLink, RESET_TOKEN_MINUTES } from "@/lib/password";
import { jsonOk, jsonError, jsonTooManyRequests, handleApiError } from "@/lib/api";

/**
 * „Am uitat parola" — trimite linkul de resetare.
 *
 * Răspunsul e ACELAȘI indiferent dacă adresa există sau nu. Altfel, formularul
 * devine un instrument de verificat cine are cont pe platformă: cineva poate
 * încerca o listă de adrese și afla exact care sunt înregistrate.
 *
 * Până se conectează un serviciu de e-mail real, mesajul se scrie în EmailLog
 * și se poate citi din Administrare → E-mailuri.
 */

const schema = z.object({
  email: z.string().email().toLowerCase().max(200),
  locale: z.enum(["ro", "en"]).default("ro"),
});

export async function POST(req: Request) {
  try {
    // două plase: una pe IP (cineva care încearcă multe adrese) și una pe
    // adresă (ca să nu poți inunda cutia poștală a altcuiva)
    const byIp = rateLimit(`forgot-ip:${clientIp(req)}`, 10, 60 * 60_000);
    if (!byIp.allowed) return jsonTooManyRequests(byIp.retryAfterSeconds);

    const body = schema.safeParse(await req.json());
    if (!body.success) return jsonError("VALIDATION", 422);
    const { email, locale } = body.data;

    const byEmail = rateLimit(`forgot-mail:${email}`, 3, 60 * 60_000);
    if (!byEmail.allowed) return jsonOk({ sent: true }); // tăcere, nu 429

    const user = await prisma.user.findUnique({ where: { email } });

    if (user && !user.suspendedAt) {
      // cererile anterioare nefolosite se anulează — un singur link valabil
      await prisma.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      });

      const { raw, hash } = newResetToken();
      await prisma.passwordResetToken.create({
        data: { userId: user.id, tokenHash: hash, expiresAt: resetExpiry() },
      });

      const link = resetLink(raw, user.locale === "en" ? "en" : locale);
      const ro = user.locale !== "en";
      await prisma.emailLog.create({
        data: {
          toEmail: user.email,
          subject: ro ? "Resetarea parolei" : "Password reset",
          body: ro
            ? `Bună, ${user.name}.\n\nAi cerut resetarea parolei. Deschide linkul de mai jos și alege o parolă nouă:\n\n${link}\n\nLinkul e valabil ${RESET_TOKEN_MINUTES} de minute și poate fi folosit o singură dată.\nDacă nu tu ai cerut asta, ignoră mesajul — parola rămâne neschimbată.`
            : `Hello, ${user.name}.\n\nYou asked to reset your password. Open the link below and choose a new one:\n\n${link}\n\nThe link is valid for ${RESET_TOKEN_MINUTES} minutes and can be used only once.\nIf this wasn't you, ignore this message — your password stays unchanged.`,
        },
      });
    }

    return jsonOk({ sent: true });
  } catch (e) {
    return handleApiError(e);
  }
}
