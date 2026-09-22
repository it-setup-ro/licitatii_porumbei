import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";

/**
 * Șterge un link din meniul „Curse & Rezultate”.
 *
 * Nu atârnă nimic de el.
 */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;

    const link = await prisma.externalLink.findUnique({ where: { id }, select: { id: true, labelRo: true } });
    if (!link) return jsonError("NOT_FOUND", 404);

    await prisma.$transaction([
      prisma.externalLink.delete({ where: { id } }),
      prisma.auditLog.create({
        data: {
          actorId: admin.id,
          action: "LINK_DELETED",
          entity: "ExternalLink",
          entityId: id,
          dataJson: JSON.stringify({ label: link.labelRo }),
        },
      }),
    ]);
    return jsonOk({ deleted: true });
  } catch (e) {
    return handleApiError(e);
  }
}
