import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError, jsonValidationError } from "@/lib/api";
import { isAlertEvent } from "@/lib/alerts";

const schema = z.object({
  label: z.string().trim().min(2).max(80).optional(),
  active: z.boolean().optional(),
  events: z.array(z.string()).max(20).optional(),
});

/** Schimbă ce primește un destinatar, sau îl pune pe pauză. */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    const body = schema.safeParse(await req.json());
    if (!body.success) return jsonValidationError(body.error);

    const exista = await prisma.alertRecipient.findUnique({ where: { id } });
    if (!exista) return jsonError("NOT_FOUND", 404);

    const events = body.data.events?.filter(isAlertEvent);
    await prisma.alertRecipient.update({
      where: { id },
      data: {
        ...(body.data.label !== undefined ? { label: body.data.label } : {}),
        ...(body.data.active !== undefined ? { active: body.data.active } : {}),
        ...(events ? { events: JSON.stringify(events) } : {}),
      },
    });
    return jsonOk();
  } catch (e) {
    return handleApiError(e);
  }
}

/** Scoate destinatarul. Nu se pierde nimic: anunțurile nu se păstrează. */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;
    const exista = await prisma.alertRecipient.findUnique({ where: { id } });
    if (!exista) return jsonError("NOT_FOUND", 404);

    await prisma.$transaction([
      prisma.alertRecipient.delete({ where: { id } }),
      prisma.auditLog.create({
        data: {
          actorId: admin.id,
          action: "ALERT_RECIPIENT_DELETED",
          entity: "AlertRecipient",
          entityId: id,
          dataJson: JSON.stringify({ label: exista.label, kind: exista.kind }),
        },
      }),
    ]);
    return jsonOk();
  } catch (e) {
    return handleApiError(e);
  }
}
