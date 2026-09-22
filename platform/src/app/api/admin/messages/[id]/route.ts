import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";

/**
 * Un mesaj din formularul de contact: se bifează „rezolvat" sau se șterge.
 *
 * Câmpul „rezolvat" exista în bază, dar nimic nu-l scria — contorul din meniu
 * creștea la nesfârșit. Ștergerea e necesară și legal: mesajul are numele și
 * e-mailul omului.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;
    const body = z.object({ handled: z.boolean() }).safeParse(await req.json());
    if (!body.success) return jsonError("VALIDATION", 422);

    const mesaj = await prisma.contactMessage.findUnique({ where: { id }, select: { id: true } });
    if (!mesaj) return jsonError("NOT_FOUND", 404);

    await prisma.$transaction([
      prisma.contactMessage.update({
        where: { id },
        data: { handledAt: body.data.handled ? new Date() : null },
      }),
      prisma.auditLog.create({
        data: {
          actorId: admin.id,
          action: body.data.handled ? "MESSAGE_HANDLED" : "MESSAGE_REOPENED",
          entity: "ContactMessage",
          entityId: id,
        },
      }),
    ]);
    return jsonOk({ handled: body.data.handled });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;

    const mesaj = await prisma.contactMessage.findUnique({ where: { id }, select: { id: true, email: true } });
    if (!mesaj) return jsonError("NOT_FOUND", 404);

    await prisma.$transaction([
      prisma.contactMessage.delete({ where: { id } }),
      prisma.auditLog.create({
        data: {
          actorId: admin.id,
          action: "MESSAGE_DELETED",
          entity: "ContactMessage",
          entityId: id,
          dataJson: JSON.stringify({ email: mesaj.email }),
        },
      }),
    ]);
    return jsonOk({ deleted: true });
  } catch (e) {
    return handleApiError(e);
  }
}
