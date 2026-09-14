import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";

/**
 * Retrage drepturile de administrator.
 *
 * Două siguranțe: nimeni nu și le poate retrage singur (s-ar putea bloca din
 * greșeală), și platforma nu rămâne niciodată fără niciun administrator.
 */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;

    if (id === admin.id) return jsonError("CANNOT_REVOKE_SELF", 400);

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || user.role !== "ADMIN") return jsonError("NOT_FOUND", 404);

    const admins = await prisma.user.count({ where: { role: "ADMIN", suspendedAt: null } });
    if (admins <= 1) return jsonError("LAST_ADMIN", 400);

    // revine la ce era înainte: crescător aprobat sau cumpărător
    const role = user.sellerStatus === "APPROVED" ? "SELLER" : "BUYER";

    await prisma.$transaction([
      prisma.user.update({ where: { id }, data: { role } }),
      prisma.auditLog.create({
        data: {
          actorId: admin.id,
          action: "ADMIN_REVOKED",
          entity: "User",
          entityId: id,
          dataJson: JSON.stringify({ rolAcum: role }),
        },
      }),
    ]);
    return jsonOk({ role });
  } catch (e) {
    return handleApiError(e);
  }
}
