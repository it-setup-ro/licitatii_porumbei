import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError, jsonValidationError } from "@/lib/api";
import { notify } from "@/lib/notify";

/**
 * Răspunsul adminului la o propunere de articol: o publică sau o refuză.
 * În ambele cazuri autorul află — altfel scrie o poveste și nu mai știe nimic
 * de ea.
 */
const schema = z.object({
  action: z.enum(["PUBLISH", "REJECT"]),
  note: z.string().trim().max(500).optional(),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;
    const body = schema.safeParse(await req.json());
    if (!body.success) return jsonValidationError(body.error);

    const articol = await prisma.article.findUnique({ where: { id } });
    if (!articol) return jsonError("NOT_FOUND", 404);

    const publica = body.data.action === "PUBLISH";
    await prisma.$transaction([
      prisma.article.update({
        where: { id },
        data: {
          publishedAt: publica ? (articol.publishedAt ?? new Date()) : null,
          reviewNote: body.data.note || null,
        },
      }),
      prisma.auditLog.create({
        data: {
          actorId: admin.id,
          action: publica ? "ARTICLE_PUBLISHED" : "ARTICLE_REJECTED",
          entity: "Article",
          entityId: id,
          dataJson: JSON.stringify({ titlu: articol.titleRo, nota: body.data.note ?? null }),
        },
      }),
    ]);

    if (articol.proposedById) {
      await notify(
        articol.proposedById,
        publica ? "ARTICLE_PUBLISHED" : "ARTICLE_REJECTED",
        {
          titlu: articol.titleRo,
          ...(body.data.note ? { raspuns: body.data.note } : {}),
        },
        publica ? `/ro/articles/${articol.slug}` : "/ro/articles/propose"
      );
    }

    return jsonOk({ published: publica });
  } catch (e) {
    return handleApiError(e);
  }
}
