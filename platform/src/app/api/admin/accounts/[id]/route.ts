import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { notify } from "@/lib/notify";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";

/**
 * Aprobarea sau respingerea unui cont nou.
 *
 * Clientul: „Logarea o aprobă administratorul!" Omul își poate face contul și
 * poate vedea licitațiile, dar licitează abia după aprobare. Un cont respins
 * se poate aproba ulterior, dacă a fost o greșeală.
 */

const schema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  reason: z.string().trim().max(300).optional(),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;
    const body = schema.safeParse(await req.json());
    if (!body.success) return jsonError("VALIDATION", 422);

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return jsonError("NOT_FOUND", 404);
    if (user.role === "ADMIN") return jsonError("IS_ADMIN", 400);

    const approved = body.data.action === "APPROVE";
    const reason = approved ? null : body.data.reason || null;

    await prisma.$transaction([
      prisma.user.update({
        where: { id },
        data: {
          accountStatus: approved ? "APPROVED" : "REJECTED",
          accountReviewedAt: new Date(),
          accountReviewedById: admin.id,
          accountRejectReason: reason,
        },
      }),
      prisma.auditLog.create({
        data: {
          actorId: admin.id,
          action: approved ? "ACCOUNT_APPROVED" : "ACCOUNT_REJECTED",
          entity: "User",
          entityId: id,
          dataJson: reason ? JSON.stringify({ reason }) : null,
        },
      }),
    ]);

    await notify(
      id,
      approved ? "ACCOUNT_APPROVED" : "ACCOUNT_REJECTED",
      reason ? { reason } : {},
      "/account"
    );
    return jsonOk();
  } catch (e) {
    return handleApiError(e);
  }
}
