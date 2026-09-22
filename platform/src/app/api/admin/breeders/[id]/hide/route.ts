import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";

/**
 * Ascunde un crescător de pe site, sau îl aduce înapoi.
 *
 * Nu se șterge niciodată: are licitații, articole și istoric de vânzări. Ascuns,
 * nu mai apare la Crescători, nici pe prima pagină, iar licitațiile lui ies din
 * listele publice.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;
    const body = z.object({ hidden: z.boolean() }).safeParse(await req.json());
    if (!body.success) return jsonError("VALIDATION", 422);

    const breeder = await prisma.breeder.findUnique({ where: { id }, select: { id: true, name: true } });
    if (!breeder) return jsonError("NOT_FOUND", 404);

    await prisma.$transaction([
      prisma.breeder.update({
        where: { id },
        data: { hiddenAt: body.data.hidden ? new Date() : null },
      }),
      prisma.auditLog.create({
        data: {
          actorId: admin.id,
          action: body.data.hidden ? "BREEDER_HIDDEN" : "BREEDER_SHOWN",
          entity: "Breeder",
          entityId: id,
          dataJson: JSON.stringify({ name: breeder.name }),
        },
      }),
    ]);
    return jsonOk({ hidden: body.data.hidden });
  } catch (e) {
    return handleApiError(e);
  }
}
