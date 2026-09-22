import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";

/**
 * Șterge definitiv un abonat.
 *
 * Dezabonarea doar marca data; adresa rămânea în bază. Când omul cere ștergerea
 * datelor lui, asta o face.
 */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;

    const abonat = await prisma.newsletterSubscriber.findUnique({
      where: { id },
      select: { id: true, email: true },
    });
    if (!abonat) return jsonError("NOT_FOUND", 404);

    await prisma.$transaction([
      prisma.newsletterSubscriber.delete({ where: { id } }),
      prisma.auditLog.create({
        data: {
          actorId: admin.id,
          action: "SUBSCRIBER_DELETED",
          entity: "NewsletterSubscriber",
          entityId: id,
          dataJson: JSON.stringify({ email: abonat.email }),
        },
      }),
    ]);
    return jsonOk({ deleted: true });
  } catch (e) {
    return handleApiError(e);
  }
}
