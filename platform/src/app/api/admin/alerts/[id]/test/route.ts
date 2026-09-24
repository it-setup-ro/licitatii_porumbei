import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { requireAdmin } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { sendEmail } from "@/lib/mailer";
import { telegramConfigured, telegramSend } from "@/lib/telegram";

/**
 * „Trimite test" — singurul mod cinstit de a ști că legătura chiar merge.
 * Spune pe loc ce s-a întâmplat, nu doar „am încercat".
 */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    const d = await prisma.alertRecipient.findUnique({ where: { id } });
    if (!d) return jsonError("NOT_FOUND", 404);

    const { siteName } = await getSettings();
    const text = `Test de la ${siteName}: legătura merge. Aici vor ajunge anunțurile de pe site.`;
    try {
      if (d.kind === "EMAIL" && d.email) {
        await sendEmail({ to: d.email, subject: `Test anunțuri — ${siteName}`, text });
      } else if (d.kind === "TELEGRAM" && d.chatId) {
        if (!telegramConfigured()) return jsonError("TELEGRAM_NECONFIGURAT", 409);
        await telegramSend(d.chatId, text);
      } else {
        return jsonError("NELEGAT", 409);
      }
    } catch (e) {
      const mesaj = e instanceof Error ? e.message.slice(0, 300) : "eroare necunoscută";
      await prisma.alertRecipient.update({ where: { id }, data: { lastError: mesaj } });
      return jsonError("TRIMITERE_ESUATA", 502, { detail: mesaj });
    }

    await prisma.alertRecipient.update({
      where: { id },
      data: { lastSentAt: new Date(), lastError: null },
    });
    return jsonOk();
  } catch (e) {
    return handleApiError(e);
  }
}
