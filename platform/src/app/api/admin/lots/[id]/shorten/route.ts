import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { emitAuctionEvent } from "@/lib/events";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";

/**
 * UNEALTA DE TEST — scurteaza o licitatie ca sa se inchida peste un minut.
 *
 * Exista ca sa se poata verifica in cateva minute tot ce se intampla la final
 * (anti-sniping, desemnarea castigatorului, animatia, notificarile, comanda),
 * fara sa astepti paisprezece zile sau sa umbli in baza de date.
 *
 * Se stinge din Setari → „Unelte de test", fara sa fie nevoie de o schimbare
 * de cod. Cand platforma intra pe public, comutatorul se pune pe oprit.
 */

/** Un minut: destul cat sa apuci sa deschizi pagina si sa mai licitezi o data. */
const SHORTEN_TO_MS = 60_000;

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;

    const settings = await getSettings();
    if (!settings.testShortenEnabled) return jsonError("TEST_TOOLS_DISABLED", 403);

    const auction = await prisma.auction.findUnique({ where: { id } });
    if (!auction) return jsonError("NOT_FOUND", 404);
    if (!["LIVE", "SCHEDULED"].includes(auction.status)) return jsonError("NOT_LIVE", 400);

    const now = new Date();
    const endsAt = new Date(now.getTime() + SHORTEN_TO_MS);

    await prisma.$transaction([
      prisma.auction.update({
        where: { id },
        data: {
          // o licitatie programata porneste acum, altfel nu are ce sa se inchida
          status: "LIVE",
          startsAt: auction.startsAt > now ? now : auction.startsAt,
          endsAt,
          // si originalEndsAt, altfel anti-snipingul crede ca licitatia a fost
          // deja prelungita cu zile intregi si refuza sa mai prelungeasca
          originalEndsAt: endsAt,
        },
      }),
      prisma.auditLog.create({
        data: {
          actorId: admin.id,
          action: "LOT_SHORTENED_FOR_TEST",
          entity: "Auction",
          entityId: id,
          dataJson: JSON.stringify({ endsAt: endsAt.toISOString() }),
        },
      }),
    ]);

    // cronometrul de pe paginile deschise se actualizeaza fara reincarcare
    emitAuctionEvent({ kind: "rescheduled", auctionId: id, endsAt: endsAt.toISOString() });

    return jsonOk({ endsAt: endsAt.toISOString() });
  } catch (e) {
    return handleApiError(e);
  }
}
