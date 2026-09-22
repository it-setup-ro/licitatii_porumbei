import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";

/**
 * Starea unei comenzi din magazin.
 *
 * Până acum comenzile intrau în bază și scădeau stocul, dar nu le vedea nimeni
 * și nu se puteau mișca — magazinul nu era de folosit. La anulare, produsele se
 * întorc în stoc: altfel ar rămâne „vândute” fără să fi plecat de la noi.
 */

const ACTIUNI = ["PAID", "SHIPPED", "DELIVERED", "CANCELLED", "PENDING_PAYMENT"] as const;

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;
    const body = z.object({ status: z.enum(ACTIUNI) }).safeParse(await req.json());
    if (!body.success) return jsonError("VALIDATION", 422);
    const nou = body.data.status;

    const order = await prisma.shopOrder.findUnique({
      where: { id },
      include: { items: { select: { productId: true, quantity: true } } },
    });
    if (!order) return jsonError("NOT_FOUND", 404);
    if (order.status === nou) return jsonOk({ status: nou });

    const seAnuleaza = nou === "CANCELLED" && order.status !== "CANCELLED";
    const seReia = order.status === "CANCELLED" && nou !== "CANCELLED";

    await prisma.$transaction(async (tx) => {
      await tx.shopOrder.update({
        where: { id },
        data: {
          status: nou,
          paidAt: nou === "PAID" && !order.paidAt ? new Date() : order.paidAt,
        },
      });

      // stocul urmează comanda: anulată → produsele se întorc; reluată → pleacă iar
      for (const item of order.items) {
        if (seAnuleaza) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        } else if (seReia) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          action: "SHOP_ORDER_STATUS",
          entity: "ShopOrder",
          entityId: id,
          dataJson: JSON.stringify({ de_la: order.status, la: nou, stoc: seAnuleaza ? "returnat" : seReia ? "scăzut la loc" : "neatins" }),
        },
      });
    });

    return jsonOk({ status: nou });
  } catch (e) {
    return handleApiError(e);
  }
}
