import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { notify } from "@/lib/notify";
import { emailTranslator } from "@/lib/messages";
import { normalizeLocale } from "@/lib/locales";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";

/**
 * Retrage un porumbel din licitație, cu anunț la cei care au licitat.
 *
 * Daniel: „retragere, cu anunț la ofertanți — au pus bani pe masă, nu putem
 * șterge urma". Licitația se închide fără câștigător, porumbelul iese de pe
 * site, iar fiecare ofertant primește un e-mail în limba lui. Rândul rămâne în
 * bază: în contul lor, oferta se vede în continuare.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;
    const body = z
      .object({ reason: z.string().trim().max(300).optional() })
      .safeParse(await req.json().catch(() => ({})));
    if (!body.success) return jsonError("VALIDATION", 422);
    const reason = body.data.reason?.trim() || null;

    const auction = await prisma.auction.findUnique({
      where: { id },
      include: {
        pigeon: { select: { name: true, ringNumber: true } },
        bids: { select: { bidderId: true } },
      },
    });
    if (!auction) return jsonError("NOT_FOUND", 404);
    if (auction.status === "CLOSED" && auction.winnerId) {
      // are câștigător: acolo se folosește „porumbel indisponibil", care anulează comanda
      return jsonError("ALREADY_SOLD", 409);
    }

    const ofertanti = [...new Set(auction.bids.map((b) => b.bidderId))];

    await prisma.$transaction([
      prisma.auction.update({
        where: { id },
        data: {
          status: "CLOSED",
          closedAt: new Date(),
          hiddenAt: new Date(),
          winnerId: null,
          winningBidId: null,
          unavailableAt: new Date(),
          unavailableReason: reason ?? "retras de administrator",
        },
      }),
      prisma.auditLog.create({
        data: {
          actorId: admin.id,
          action: "AUCTION_WITHDRAWN",
          entity: "Auction",
          entityId: id,
          dataJson: JSON.stringify({
            pigeon: auction.pigeon.name,
            ring: auction.pigeon.ringNumber,
            bidders: ofertanti.length,
            reason,
          }),
        },
      }),
    ]);

    // anunțul pleacă după ce retragerea e scrisă: mai bine un e-mail întârziat
    // decât unul trimis pentru ceva ce n-a apucat să se salveze
    for (const bidderId of ofertanti) {
      const user = await prisma.user.findUnique({
        where: { id: bidderId },
        select: { locale: true },
      });
      const t = emailTranslator(normalizeLocale(user?.locale));
      await notify(
        bidderId,
        "AUCTION_WITHDRAWN",
        { lot: auction.pigeon.name },
        `/auctions/${id}`,
        {
          emailText: [
            t("hello"),
            "",
            t("withdrawn.body", { pigeon: auction.pigeon.name, ring: auction.pigeon.ringNumber }),
            ...(reason ? ["", t("withdrawn.reason", { reason })] : []),
          ].join("\n"),
        }
      );
    }

    return jsonOk({ withdrawn: true, notified: ofertanti.length });
  } catch (e) {
    return handleApiError(e);
  }
}
