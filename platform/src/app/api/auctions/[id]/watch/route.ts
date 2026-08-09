import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const auction = await prisma.auction.findUnique({ where: { id } });
    if (!auction) return jsonError("NOT_FOUND", 404);

    const key = { userId_auctionId: { userId: user.id, auctionId: id } };
    const existing = await prisma.watchItem.findUnique({ where: key });
    if (existing) {
      await prisma.watchItem.delete({ where: key });
      return jsonOk({ watching: false });
    }
    await prisma.watchItem.create({ data: { userId: user.id, auctionId: id } });
    return jsonOk({ watching: true });
  } catch (e) {
    return handleApiError(e);
  }
}
