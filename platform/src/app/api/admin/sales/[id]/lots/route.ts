import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { jsonOk, jsonError, handleApiError, jsonValidationError } from "@/lib/api";

/**
 * Un lot nou într-o licitație de crescător. Primește singur următorul număr.
 */

const schema = z.object({
  startsAt: z.string().datetime({ message: "Alege data și ora de început." }),
  endsAt: z.string().datetime({ message: "Alege data și ora de sfârșit." }),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id: saleId } = await ctx.params;
    const body = schema.safeParse(await req.json());
    if (!body.success) return jsonValidationError(body.error);

    const startsAt = new Date(body.data.startsAt);
    const endsAt = new Date(body.data.endsAt);
    if (endsAt <= startsAt) {
      return jsonError("VALIDATION", 422, {
        fields: { endsAt: "Sfârșitul trebuie să fie după început." },
      });
    }

    const settings = await getSettings();
    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: { lots: { select: { number: true } } },
    });
    if (!sale) return jsonError("NOT_FOUND", 404);
    if (sale.lots.length >= settings.saleMaxLots) {
      return jsonError("TOO_MANY_LOTS", 409, { max: settings.saleMaxLots });
    }

    const number = Math.max(0, ...sale.lots.map((l) => l.number)) + 1;
    const lot = await prisma.lot.create({ data: { saleId, number, startsAt, endsAt } });

    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: "LOT_CREATED",
        entity: "Lot",
        entityId: lot.id,
        dataJson: JSON.stringify({ saleId, number }),
      },
    });
    return jsonOk({ id: lot.id, number });
  } catch (e) {
    return handleApiError(e);
  }
}
