import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";

/**
 * Scoate un porumbel de pe site, sau îl aduce înapoi.
 *
 * Clientul: „porumbei de la preț fix, și aceia să se poată ascunde să nu mai
 * apară sau să se șteargă". Ascunderea nu atinge nimic: licitația, ofertele și
 * comanda rămân cum sunt, doar nu mai apare în liste, în căutare și pe pagina
 * lui. Pentru cazurile fără urmă există ștergerea (DELETE pe licitație).
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;
    const body = z.object({ hidden: z.boolean() }).safeParse(await req.json());
    if (!body.success) return jsonError("VALIDATION", 422);

    const auction = await prisma.auction.findUnique({
      where: { id },
      select: { id: true, pigeon: { select: { name: true, ringNumber: true } } },
    });
    if (!auction) return jsonError("NOT_FOUND", 404);

    await prisma.$transaction([
      prisma.auction.update({
        where: { id },
        data: { hiddenAt: body.data.hidden ? new Date() : null },
      }),
      prisma.auditLog.create({
        data: {
          actorId: admin.id,
          action: body.data.hidden ? "AUCTION_HIDDEN" : "AUCTION_SHOWN",
          entity: "Auction",
          entityId: id,
          dataJson: JSON.stringify({
            pigeon: auction.pigeon.name,
            ring: auction.pigeon.ringNumber,
          }),
        },
      }),
    ]);

    return jsonOk({ hidden: body.data.hidden });
  } catch (e) {
    return handleApiError(e);
  }
}
