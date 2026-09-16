import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";

/** Bifează (sau redeschide) o cerere „Vreau să organizez o licitație". */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    const body = z.object({ handled: z.boolean() }).safeParse(await req.json());
    if (!body.success) return jsonError("VALIDATION", 422);

    const exists = await prisma.auctionRequest.findUnique({ where: { id } });
    if (!exists) return jsonError("NOT_FOUND", 404);

    await prisma.auctionRequest.update({
      where: { id },
      data: { handledAt: body.data.handled ? new Date() : null },
    });
    return jsonOk({ handled: body.data.handled });
  } catch (e) {
    return handleApiError(e);
  }
}
