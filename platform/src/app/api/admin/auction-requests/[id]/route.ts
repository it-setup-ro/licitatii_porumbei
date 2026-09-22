import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";

/** Bifează (sau redeschide) o cerere „Vreau să organizez o licitație". */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    const body = z.object({ handled: z.boolean() }).safeParse(await req.json());
    if (!body.success) return jsonError("VALIDATION", 422);

    const exists = await prisma.auctionRequest.findUnique({ where: { id } });
    if (!exists) return jsonError("NOT_FOUND", 404);

    await prisma.auctionRequest.update({
      where: { id },
      data: { handledAt: body.data.handled ? new Date() : null },
    });
    return jsonOk({ handled: body.data.handled });
  } catch (e) {
    return handleApiError(e);
  }
}

/** Șterge o cerere. Conține nume, telefon și e-mail: se poate cere ștergerea. */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;

    const cerere = await prisma.auctionRequest.findUnique({
      where: { id },
      select: { id: true, email: true },
    });
    if (!cerere) return jsonError("NOT_FOUND", 404);

    await prisma.$transaction([
      prisma.auctionRequest.delete({ where: { id } }),
      prisma.auditLog.create({
        data: {
          actorId: admin.id,
          action: "AUCTION_REQUEST_DELETED",
          entity: "AuctionRequest",
          entityId: id,
          dataJson: JSON.stringify({ email: cerere.email }),
        },
      }),
    ]);
    return jsonOk({ deleted: true });
  } catch (e) {
    return handleApiError(e);
  }
}
