import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { newResetToken, resetExpiry, resetLink, RESET_TOKEN_MINUTES } from "@/lib/password";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";

/**
 * Adminul generează un link de resetare pentru un utilizator.
 *
 * Există pentru cazul în care omul nu primește e-mailul (adresă greșită, cutie
 * plină, serviciul de e-mail încă neconectat): îi dai linkul prin telefon.
 *
 * Adminul NU vede și nu poate afla parola nimănui — parolele sunt păstrate
 * doar ca amprentă. Linkul se arată o singură dată, la generare, și fiecare
 * generare rămâne în jurnalul de audit.
 */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return jsonError("NOT_FOUND", 404);

    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const { raw, hash } = newResetToken();
    await prisma.$transaction([
      prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: hash,
          expiresAt: resetExpiry(),
          issuedBy: "ADMIN",
        },
      }),
      prisma.auditLog.create({
        data: {
          actorId: admin.id,
          action: "PASSWORD_RESET_LINK_ISSUED",
          entity: "User",
          entityId: user.id,
          dataJson: JSON.stringify({ email: user.email }),
        },
      }),
    ]);

    return jsonOk({
      link: resetLink(raw, user.locale === "en" ? "en" : "ro"),
      minutes: RESET_TOKEN_MINUTES,
      email: user.email,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
