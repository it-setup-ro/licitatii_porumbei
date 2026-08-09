import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { notify } from "@/lib/notify";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";

const schema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  reason: z.string().max(500).optional(),
  /** ISO date pentru start; default: peste 24h */
  startsAt: z.string().datetime().optional(),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;
    const body = schema.safeParse(await req.json());
    if (!body.success) return jsonError("VALIDATION", 422);

    const auction = await prisma.auction.findUnique({
      where: { id },
      include: { pigeon: true },
    });
    if (!auction || auction.status !== "PENDING_APPROVAL") return jsonError("NOT_FOUND", 404);

    if (body.data.action === "REJECT") {
      await prisma.$transaction([
        prisma.auction.update({
          where: { id },
          data: { status: "REJECTED", rejectReason: body.data.reason ?? null },
        }),
        prisma.auditLog.create({
          data: {
            actorId: admin.id,
            action: "LOT_REJECTED",
            entity: "Auction",
            entityId: id,
            dataJson: JSON.stringify({ reason: body.data.reason }),
          },
        }),
      ]);
      await notify(
        auction.sellerId,
        "LOT_REJECTED",
        { lot: auction.pigeon.titleRo, reason: body.data.reason ?? "-" },
        "/account/lots"
      );
      return jsonOk();
    }

    const settings = await getSettings();
    const startsAt = body.data.startsAt
      ? new Date(body.data.startsAt)
      : new Date(Date.now() + 24 * 3_600_000);
    const endsAt = new Date(startsAt.getTime() + settings.defaultDurationDays * 86_400_000);
    const isLiveNow = startsAt <= new Date();

    await prisma.$transaction([
      prisma.auction.update({
        where: { id },
        data: {
          status: isLiveNow ? "LIVE" : "SCHEDULED",
          startsAt,
          endsAt,
          originalEndsAt: endsAt,
          approvedAt: new Date(),
          approvedById: admin.id,
        },
      }),
      prisma.auditLog.create({
        data: { actorId: admin.id, action: "LOT_APPROVED", entity: "Auction", entityId: id },
      }),
    ]);
    await notify(
      auction.sellerId,
      "LOT_APPROVED",
      { lot: auction.pigeon.titleRo },
      `/auctions/${id}`
    );
    return jsonOk();
  } catch (e) {
    return handleApiError(e);
  }
}
