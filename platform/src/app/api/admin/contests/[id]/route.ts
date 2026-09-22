import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";

/**
 * Șterge un concurs.
 *
 * Porumbeii care fuseseră legați de el rămân — li se scoate doar legătura, ca
 * să nu dispară licitații odată cu un concurs.
 */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;

    const contest = await prisma.contest.findUnique({ where: { id }, select: { id: true, titleRo: true } });
    if (!contest) return jsonError("NOT_FOUND", 404);

    await prisma.$transaction(async (tx) => {
      await tx.auction.updateMany({ where: { contestId: id }, data: { contestId: null } });
      await tx.contest.delete({ where: { id } });
      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          action: "CONTEST_DELETED",
          entity: "Contest",
          entityId: id,
          dataJson: JSON.stringify({ title: contest.titleRo }),
        },
      });
    });
    return jsonOk({ deleted: true });
  } catch (e) {
    return handleApiError(e);
  }
}
