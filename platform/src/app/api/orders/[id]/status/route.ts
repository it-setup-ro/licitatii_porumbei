import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";

const schema = z.object({ action: z.enum(["SHIP", "DELIVER"]) });

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const body = schema.safeParse(await req.json());
    if (!body.success) return jsonError("VALIDATION", 422);

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return jsonError("NOT_FOUND", 404);

    if (body.data.action === "SHIP") {
      // doar vanzatorul marcheaza expedierea, dupa plata
      if (order.sellerId !== user.id && user.role !== "ADMIN") return jsonError("FORBIDDEN", 403);
      if (order.status !== "PAID") return jsonError("INVALID_STATE", 400);
      await prisma.order.update({ where: { id }, data: { status: "SHIPPED" } });
      return jsonOk({ status: "SHIPPED" });
    }

    // DELIVER: cumparatorul confirma primirea
    if (order.buyerId !== user.id && user.role !== "ADMIN") return jsonError("FORBIDDEN", 403);
    if (order.status !== "SHIPPED" && order.status !== "PAID") return jsonError("INVALID_STATE", 400);

    const settings = await getSettings();
    await prisma.order.update({
      where: { id },
      data: {
        status: "DELIVERED",
        ...(settings.payoutMode === "ON_DELIVERY"
          ? { payoutStatus: "RELEASED", payoutAt: new Date() }
          : {}),
      },
    });
    return jsonOk({ status: "DELIVERED" });
  } catch (e) {
    return handleApiError(e);
  }
}
