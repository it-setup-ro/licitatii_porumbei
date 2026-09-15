import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { notify } from "@/lib/notify";
import { jsonOk, jsonError, handleApiError, jsonValidationError } from "@/lib/api";

/**
 * „Porumbel indisponibil" — clientul, Punctul 5: dacă porumbelul se îmbolnăvește
 * sau moare, licitația merge până la capăt, apoi câștigătorul e anunțat că nu
 * poate intra în posesia lui. Comanda se anulează; nu se ia comision.
 */

const schema = z.object({ reason: z.string().trim().max(300).optional() });

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;
    const body = schema.safeParse(await req.json().catch(() => ({})));
    if (!body.success) return jsonValidationError(body.error);

    const auction = await prisma.auction.findUnique({
      where: { id },
      include: { pigeon: true, order: true },
    });
    if (!auction) return jsonError("NOT_FOUND", 404);
    // licitația merge până la capăt: abia după închidere
    if (auction.status !== "CLOSED") return jsonError("NOT_CLOSED", 409);
    if (auction.unavailableAt) return jsonError("ALREADY_UNAVAILABLE", 409);

    const reason = body.data.reason || null;
    await prisma.$transaction([
      prisma.auction.update({
        where: { id },
        data: { unavailableAt: new Date(), unavailableReason: reason },
      }),
      ...(auction.order
        ? [prisma.order.update({ where: { id: auction.order.id }, data: { status: "CANCELLED" } })]
        : []),
      prisma.auditLog.create({
        data: {
          actorId: admin.id,
          action: "PIGEON_UNAVAILABLE",
          entity: "Auction",
          entityId: id,
          dataJson: JSON.stringify({ reason, orderId: auction.order?.id ?? null }),
        },
      }),
    ]);

    if (auction.winnerId) {
      await notify(
        auction.winnerId,
        "PIGEON_UNAVAILABLE",
        { lot: auction.pigeon.name, reason: reason ?? "" },
        `/auctions/${id}`
      );
    }
    return jsonOk();
  } catch (e) {
    return handleApiError(e);
  }
}
