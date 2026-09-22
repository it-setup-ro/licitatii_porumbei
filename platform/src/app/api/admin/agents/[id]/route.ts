import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";

/**
 * Șterge un transportator sau agent.
 *
 * Nu atârnă nimic de el.
 */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;

    const agent = await prisma.shippingAgent.findUnique({ where: { id }, select: { id: true, name: true } });
    if (!agent) return jsonError("NOT_FOUND", 404);

    await prisma.$transaction([
      prisma.shippingAgent.delete({ where: { id } }),
      prisma.auditLog.create({
        data: {
          actorId: admin.id,
          action: "AGENT_DELETED",
          entity: "ShippingAgent",
          entityId: id,
          dataJson: JSON.stringify({ name: agent.name }),
        },
      }),
    ]);
    return jsonOk({ deleted: true });
  } catch (e) {
    return handleApiError(e);
  }
}
