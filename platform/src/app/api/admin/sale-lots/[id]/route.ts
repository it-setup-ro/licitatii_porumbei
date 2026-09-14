import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { lotIsLocked, statusAtStart } from "@/lib/lots";
import { jsonOk, jsonError, handleApiError, jsonValidationError } from "@/lib/api";

/**
 * Orele unui lot. Se schimbă cât lotul e în ciornă sau programat, până la ora
 * de început — după aceea „o dată începută, rămâne începută".
 */

const schema = z.object({
  startsAt: z.string().datetime({ message: "Alege data și ora de început." }),
  endsAt: z.string().datetime({ message: "Alege data și ora de sfârșit." }),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;
    const body = schema.safeParse(await req.json());
    if (!body.success) return jsonValidationError(body.error);

    const startsAt = new Date(body.data.startsAt);
    const endsAt = new Date(body.data.endsAt);
    const now = new Date();

    const lot = await prisma.lot.findUnique({ where: { id } });
    if (!lot) return jsonError("NOT_FOUND", 404);
    if (lotIsLocked(lot.status, lot.startsAt, now)) return jsonError("LOT_LOCKED", 409);

    if (endsAt <= startsAt) {
      return jsonError("VALIDATION", 422, {
        fields: { endsAt: "Sfârșitul trebuie să fie după început." },
      });
    }
    if (lot.status === "SCHEDULED" && endsAt <= now) {
      return jsonError("VALIDATION", 422, {
        fields: { endsAt: "Lotul e programat: sfârșitul trebuie să fie în viitor." },
      });
    }

    // un lot programat căruia i se mută începutul în trecut pornește acum
    const status = lot.status === "SCHEDULED" ? statusAtStart(startsAt, now) : lot.status;

    await prisma.$transaction([
      prisma.lot.update({ where: { id }, data: { startsAt, endsAt, status } }),
      prisma.auction.updateMany({
        where: { lotId: id },
        data: {
          startsAt,
          endsAt,
          originalEndsAt: endsAt,
          ...(lot.status === "SCHEDULED" ? { status } : {}),
        },
      }),
      prisma.auditLog.create({
        data: {
          actorId: admin.id,
          action: "LOT_TIMES_CHANGED",
          entity: "Lot",
          entityId: id,
          dataJson: JSON.stringify({
            inainte: { startsAt: lot.startsAt, endsAt: lot.endsAt },
            acum: { startsAt, endsAt },
          }),
        },
      }),
    ]);

    return jsonOk({ status });
  } catch (e) {
    return handleApiError(e);
  }
}
