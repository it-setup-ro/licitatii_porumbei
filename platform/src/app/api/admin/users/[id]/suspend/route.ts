import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";

/**
 * Blochează un utilizator, sau îl deblochează.
 *
 * Blocarea era respectată deja la autentificare și la licitare, dar nu exista
 * niciun buton: la primul licitator de rea-credință trebuia programator.
 * Administratorii nu se pot bloca între ei — mai întâi li se retrag drepturile.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;
    const body = z.object({ suspended: z.boolean() }).safeParse(await req.json());
    if (!body.success) return jsonError("VALIDATION", 422);

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true },
    });
    if (!user) return jsonError("NOT_FOUND", 404);
    if (user.role === "ADMIN") return jsonError("IS_ADMIN", 409);

    await prisma.$transaction([
      prisma.user.update({
        where: { id },
        data: { suspendedAt: body.data.suspended ? new Date() : null },
      }),
      prisma.auditLog.create({
        data: {
          actorId: admin.id,
          action: body.data.suspended ? "USER_SUSPENDED" : "USER_UNSUSPENDED",
          entity: "User",
          entityId: id,
          dataJson: JSON.stringify({ email: user.email }),
        },
      }),
    ]);
    return jsonOk({ suspended: body.data.suspended });
  } catch (e) {
    return handleApiError(e);
  }
}
