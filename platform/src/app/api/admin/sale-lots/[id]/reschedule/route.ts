import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { emitAuctionEvent } from "@/lib/events";
import { jsonOk, jsonError, handleApiError, jsonValidationError } from "@/lib/api";

/**
 * Mută ora de final a unui lot deja pornit.
 *
 * Regula de bază rămâne „o dată începută, licitația rămâne începută": orele nu
 * se mai editează după start, ca nimeni să nu scurteze o licitație sub mâna
 * ofertanților. Dar clientul a pornit din greșeală un lot cu o lună de durată și
 * n-avea nicio cale să-l îndrepte — asta e portița, cu urmă în jurnal: numai
 * ora de final, numai în viitor, și numai pentru porumbeii încă deschiși.
 *
 * Cei care au licitat văd schimbarea pe loc (evenimentul „rescheduled"), iar
 * avizul de 30 de minute pleacă din nou, pentru ora cea nouă.
 */

const schema = z.object({
  endsAt: z.string().datetime({ message: "Alege data și ora de sfârșit." }),
});

/** Marjă minimă: o licitație nu se închide chiar în clipa în care apeși. */
const MINIM_MINUTE = 2;

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;
    const body = schema.safeParse(await req.json());
    if (!body.success) return jsonValidationError(body.error);

    const endsAt = new Date(body.data.endsAt);
    const now = new Date();

    const lot = await prisma.lot.findUnique({
      where: { id },
      include: { auctions: { select: { id: true, status: true } } },
    });
    if (!lot) return jsonError("NOT_FOUND", 404);
    if (lot.status !== "LIVE") return jsonError("NOT_LIVE", 409, { status: lot.status });
    if (endsAt.getTime() < now.getTime() + MINIM_MINUTE * 60_000) {
      return jsonError("VALIDATION", 422, {
        fields: { endsAt: `Pune o oră cu cel puțin ${MINIM_MINUTE} minute în viitor.` },
      });
    }
    if (endsAt <= lot.startsAt) {
      return jsonError("VALIDATION", 422, {
        fields: { endsAt: "Sfârșitul trebuie să fie după începutul lotului." },
      });
    }

    // numai porumbeii încă deschiși: cei închiși deja au câștigător și comandă
    const deschise = lot.auctions.filter((a) => a.status === "LIVE" || a.status === "SCHEDULED");

    await prisma.$transaction([
      prisma.lot.update({ where: { id }, data: { endsAt, endingNotifiedAt: null } }),
      prisma.auction.updateMany({
        where: { id: { in: deschise.map((a) => a.id) } },
        data: { endsAt, originalEndsAt: endsAt, endingNotifiedAt: null },
      }),
      prisma.auditLog.create({
        data: {
          actorId: admin.id,
          action: "LOT_RESCHEDULED",
          entity: "Lot",
          entityId: id,
          dataJson: JSON.stringify({
            de_la: lot.endsAt.toISOString(),
            la: endsAt.toISOString(),
            porumbei: deschise.length,
          }),
        },
      }),
    ]);

    // ecranele deschise pe porumbeii lotului primesc ora nouă pe loc
    for (const a of deschise) {
      emitAuctionEvent({ kind: "rescheduled", auctionId: a.id, endsAt: endsAt.toISOString() });
    }

    return jsonOk({ endsAt: endsAt.toISOString(), pigeons: deschise.length });
  } catch (e) {
    return handleApiError(e);
  }
}
