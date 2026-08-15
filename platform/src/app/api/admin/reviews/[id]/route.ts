import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";

const schema = z.object({
  action: z.enum(["HIDE", "KEEP"]),
  note: z.string().max(500).optional(),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;
    const body = schema.safeParse(await req.json());
    if (!body.success) return jsonError("VALIDATION", 422);

    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) return jsonError("NOT_FOUND", 404);

    const hide = body.data.action === "HIDE";
    await prisma.$transaction([
      prisma.review.update({
        where: { id },
        data: {
          status: hide ? "HIDDEN" : "VISIBLE",
          // marcam decizia luata, ca recenzia sa iasa din coada de moderare
          moderNote: body.data.note ?? (hide ? "Ascunsă de administrator" : "Păstrată"),
        },
      }),
      prisma.auditLog.create({
        data: {
          actorId: admin.id,
          action: hide ? "REVIEW_HIDDEN" : "REVIEW_KEPT",
          entity: "Review",
          entityId: id,
          dataJson: JSON.stringify({ note: body.data.note }),
        },
      }),
    ]);
    return jsonOk();
  } catch (e) {
    return handleApiError(e);
  }
}
