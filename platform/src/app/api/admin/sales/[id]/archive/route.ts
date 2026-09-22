import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";

/**
 * Arhivează o licitație veche, sau o scoate din arhivă.
 *
 * Daniel: o licitație care a vândut nu se șterge — dispare din site și din
 * listele de lucru, dar rămâne în Istoric tranzacții, la cumpărător și în
 * deconturi. Altfel s-ar pierde urma banilor.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;
    const body = z.object({ archived: z.boolean() }).safeParse(await req.json());
    if (!body.success) return jsonError("VALIDATION", 422);

    const sale = await prisma.sale.findUnique({
      where: { id },
      select: { id: true, titleRo: true, breeder: { select: { name: true } } },
    });
    if (!sale) return jsonError("NOT_FOUND", 404);

    await prisma.$transaction([
      prisma.sale.update({
        where: { id },
        data: { archivedAt: body.data.archived ? new Date() : null },
      }),
      prisma.auditLog.create({
        data: {
          actorId: admin.id,
          action: body.data.archived ? "SALE_ARCHIVED" : "SALE_UNARCHIVED",
          entity: "Sale",
          entityId: id,
          dataJson: JSON.stringify({ title: sale.titleRo, breeder: sale.breeder.name }),
        },
      }),
    ]);

    return jsonOk({ archived: body.data.archived });
  } catch (e) {
    return handleApiError(e);
  }
}
