import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { lotIsLocked } from "@/lib/lots";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";

/**
 * Scoate un lot programat înapoi în ciornă — doar înainte de ora de început.
 *
 * Pentru greșelile descoperite după „Start": o poză uitată, un porumbel pus în
 * lotul greșit. După ora de început nu mai merge: licitația a pornit.
 */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;

    const lot = await prisma.lot.findUnique({ where: { id } });
    if (!lot) return jsonError("NOT_FOUND", 404);
    if (lot.status !== "SCHEDULED") return jsonError("NOT_SCHEDULED", 409);
    if (lotIsLocked(lot.status, lot.startsAt, new Date())) return jsonError("LOT_LOCKED", 409);

    await prisma.$transaction([
      prisma.lot.update({
        where: { id },
        data: {
          status: "DRAFT",
          snipeWindowMinutes: null,
          extensionMinutes: null,
          maxExtensions: null,
          startedAt: null,
          startedById: null,
        },
      }),
      prisma.auction.updateMany({
        where: { lotId: id },
        data: { status: "DRAFT", approvedAt: null, approvedById: null },
      }),
      prisma.auditLog.create({
        data: { actorId: admin.id, action: "LOT_UNSCHEDULED", entity: "Lot", entityId: id },
      }),
    ]);

    return jsonOk();
  } catch (e) {
    return handleApiError(e);
  }
}
