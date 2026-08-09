import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { notify } from "@/lib/notify";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";

const schema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;
    const body = schema.safeParse(await req.json());
    if (!body.success) return jsonError("VALIDATION", 422);

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || user.sellerStatus !== "PENDING") return jsonError("NOT_FOUND", 404);

    const approved = body.data.action === "APPROVE";
    await prisma.$transaction([
      prisma.user.update({
        where: { id },
        data: { sellerStatus: approved ? "APPROVED" : "REJECTED" },
      }),
      prisma.auditLog.create({
        data: {
          actorId: admin.id,
          action: approved ? "SELLER_APPROVED" : "SELLER_REJECTED",
          entity: "User",
          entityId: id,
        },
      }),
    ]);
    await notify(id, approved ? "SELLER_APPROVED" : "SELLER_REJECTED", {}, "/account");
    return jsonOk();
  } catch (e) {
    return handleApiError(e);
  }
}
