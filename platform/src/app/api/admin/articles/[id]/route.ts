import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";

/**
 * Șterge un articol.
 *
 * Pozele și clipurile lui pleacă odată cu el (cascade în schemă).
 */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;

    const article = await prisma.article.findUnique({ where: { id }, select: { id: true, titleRo: true } });
    if (!article) return jsonError("NOT_FOUND", 404);

    await prisma.$transaction([
      prisma.article.delete({ where: { id } }),
      prisma.auditLog.create({
        data: {
          actorId: admin.id,
          action: "ARTICLE_DELETED",
          entity: "Article",
          entityId: id,
          dataJson: JSON.stringify({ title: article.titleRo }),
        },
      }),
    ]);
    return jsonOk({ deleted: true });
  } catch (e) {
    return handleApiError(e);
  }
}
