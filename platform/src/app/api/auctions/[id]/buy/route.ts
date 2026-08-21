import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { notify } from "@/lib/notify";
import { rateLimit } from "@/lib/rate-limit";
import { jsonOk, jsonError, jsonTooManyRequests, handleApiError } from "@/lib/api";

/**
 * „Cumpără acum" pentru loturile cu preț fix (saleMode = FIXED).
 *
 * Rezervarea e ATOMICĂ: `updateMany` cu status LIVE în condiție înseamnă că
 * doar prima cerere dintre două simultane prinde lotul; a doua primește SOLD
 * în loc să creeze o a doua comandă pentru același porumbel.
 */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;

    const check = rateLimit(`buy:${user.id}`, 20, 60_000);
    if (!check.allowed) return jsonTooManyRequests(check.retryAfterSeconds);

    const auction = await prisma.auction.findUnique({
      where: { id },
      include: { pigeon: true },
    });
    if (!auction || auction.saleMode !== "FIXED") return jsonError("NOT_FOUND", 404);
    if (auction.sellerId === user.id) return jsonError("OWN_AUCTION", 400);
    if (auction.status !== "LIVE") return jsonError("NOT_AVAILABLE", 400);

    const settings = await getSettings();
    const priceCents = auction.startPriceCents;
    const commissionPercent =
      auction.listingType === "ASSISTED"
        ? settings.commissionPercent + settings.assistedExtraPercent
        : settings.commissionPercent;

    // pas atomic: doar cine prinde lotul inca LIVE il poate cumpara
    const claimed = await prisma.auction.updateMany({
      where: { id, status: "LIVE", saleMode: "FIXED" },
      data: {
        status: "CLOSED",
        closedAt: new Date(),
        winnerId: user.id,
        currentPriceCents: priceCents,
      },
    });
    if (claimed.count !== 1) return jsonError("SOLD", 409);

    const order = await prisma.order.create({
      data: {
        auctionId: id,
        buyerId: user.id,
        sellerId: auction.sellerId,
        amountCents: priceCents,
        commissionCents: Math.round((priceCents * commissionPercent) / 100),
        currency: auction.currency,
      },
    });

    await notify(
      auction.sellerId,
      "SELLER_SOLD",
      { lot: auction.pigeon.titleRo, priceCents },
      "/account/sales"
    );

    return jsonOk({ orderId: order.id });
  } catch (e) {
    return handleApiError(e);
  }
}
