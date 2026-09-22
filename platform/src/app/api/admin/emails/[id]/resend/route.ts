import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { deliver } from "@/lib/mailer";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";

/**
 * Trimite din nou un e-mail din jurnal.
 *
 * Cazul real: câștigătorul spune că n-a primit datele de plată. Până acum,
 * singura soluție era programatorul; acum administratorul apasă un buton, iar
 * rândul din jurnal arată dacă a plecat sau ce a răspuns serverul.
 */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;

    const log = await prisma.emailLog.findUnique({ where: { id } });
    if (!log) return jsonError("NOT_FOUND", 404);

    const rezultat = await deliver(id, {
      to: log.toEmail,
      subject: log.subject,
      text: log.body,
    });

    await prisma.$transaction([
      prisma.emailLog.update({
        where: { id },
        data: { attempts: { increment: 1 } },
      }),
      prisma.auditLog.create({
        data: {
          actorId: admin.id,
          action: "EMAIL_RESENT",
          entity: "EmailLog",
          entityId: id,
          dataJson: JSON.stringify({ to: log.toEmail, sent: rezultat.sent }),
        },
      }),
    ]);

    return jsonOk({ sent: rezultat.sent });
  } catch (e) {
    return handleApiError(e);
  }
}
