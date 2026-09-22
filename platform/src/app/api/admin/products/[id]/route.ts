import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";

/**
 * Șterge un produs din magazin.
 *
 * Dacă a fost cumpărat vreodată, nu se șterge: comanda clientului ar rămâne
 * fără produs. Atunci se stinge din „Vizibil în magazin”.
 */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;

    const product = await prisma.product.findUnique({ where: { id }, select: { id: true, nameRo: true } });
    if (!product) return jsonError("NOT_FOUND", 404);

    const comenzi = await prisma.shopOrderItem.count({ where: { productId: id } });
    if (comenzi > 0) return jsonError("HAS_HISTORY", 409, { orders: comenzi });

    await prisma.$transaction([
      prisma.product.delete({ where: { id } }),
      prisma.auditLog.create({
        data: {
          actorId: admin.id,
          action: "PRODUCT_DELETED",
          entity: "Product",
          entityId: id,
          dataJson: JSON.stringify({ name: product.nameRo }),
        },
      }),
    ]);
    return jsonOk({ deleted: true });
  } catch (e) {
    return handleApiError(e);
  }
}
