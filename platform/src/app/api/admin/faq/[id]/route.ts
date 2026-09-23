import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";

/** Șterge o întrebare de la Ajutor. */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;
    const exista = await prisma.faqItem.findUnique({ where: { id } });
    if (!exista) return jsonError("NOT_FOUND", 404);

    await prisma.$transaction([
      prisma.faqItem.delete({ where: { id } }),
      prisma.auditLog.create({
        data: {
          actorId: admin.id,
          action: "FAQ_DELETED",
          entity: "FaqItem",
          entityId: id,
          dataJson: JSON.stringify({ intrebare: exista.questionRo }),
        },
      }),
    ]);
    return jsonOk();
  } catch (e) {
    return handleApiError(e);
  }
}
