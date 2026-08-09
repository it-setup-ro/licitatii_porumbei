import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";

const schema = z.object({ reply: z.string().min(1).max(2000) });

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const body = schema.safeParse(await req.json());
    if (!body.success) return jsonError("VALIDATION", 422);

    const review = await prisma.review.findUnique({ where: { id } });
    if (!review || review.sellerId !== user.id) return jsonError("NOT_FOUND", 404);

    await prisma.review.update({ where: { id }, data: { sellerReply: body.data.reply } });
    return jsonOk();
  } catch (e) {
    return handleApiError(e);
  }
}
