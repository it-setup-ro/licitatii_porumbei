import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";

/**
 * Limita de licitare a unui singur cont.
 *
 * Daniel: „cei noi au limita de 5000 lei. Cum poate să o ridice adminul?" —
 * până acum doar global, din Setări, pentru toți deodată. Câmpul exista în
 * bază de la început (`User.bidLimitOverride`), dar n-avea niciun buton.
 *
 * `null` = contul merge pe limita generală din Setări; `0` = fără limită,
 * pentru un cumpărător cunoscut care vine la o licitație mare.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;
    const body = z
      .object({ limitCents: z.number().int().min(0).max(1_000_000_000).nullable() })
      .safeParse(await req.json());
    if (!body.success) return jsonError("VALIDATION", 422);

    const user = await prisma.user.findUnique({ where: { id }, select: { id: true, email: true } });
    if (!user) return jsonError("NOT_FOUND", 404);

    await prisma.$transaction([
      prisma.user.update({ where: { id }, data: { bidLimitOverride: body.data.limitCents } }),
      prisma.auditLog.create({
        data: {
          actorId: admin.id,
          action: "USER_BID_LIMIT",
          entity: "User",
          entityId: id,
          dataJson: JSON.stringify({ email: user.email, limitCents: body.data.limitCents }),
        },
      }),
    ]);
    return jsonOk({ limitCents: body.data.limitCents });
  } catch (e) {
    return handleApiError(e);
  }
}
