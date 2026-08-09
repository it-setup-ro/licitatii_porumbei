import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";

const schema = z.object({ reason: z.string().min(3).max(500) });

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const { id } = await ctx.params;
    const body = schema.safeParse(await req.json());
    if (!body.success) return jsonError("VALIDATION", 422);

    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) return jsonError("NOT_FOUND", 404);

    await prisma.review.update({
      where: { id },
      data: { status: "REPORTED", reportReason: body.data.reason },
    });
    return jsonOk();
  } catch (e) {
    return handleApiError(e);
  }
}
