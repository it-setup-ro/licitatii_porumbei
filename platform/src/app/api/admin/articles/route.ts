import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { SAFE_MEDIA_URL } from "@/lib/limits";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";

const schema = z.object({
  id: z.string().max(40).optional(),
  slug: z
    .string()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9-]+$/),
  titleRo: z.string().min(3).max(200),
  titleEn: z.string().min(3).max(200),
  excerptRo: z.string().max(500).optional(),
  excerptEn: z.string().max(500).optional(),
  bodyRo: z.string().min(10).max(50_000),
  bodyEn: z.string().min(10).max(50_000),
  coverUrl: z.string().max(300).regex(SAFE_MEDIA_URL).optional().or(z.literal("")),
  /** true = publicat imediat, false = ciornă (nu apare public) */
  published: z.boolean(),
});

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    const body = schema.safeParse(await req.json());
    if (!body.success) return jsonError("VALIDATION", 422);
    const { id, coverUrl, published, ...rest } = body.data;

    const existing = id ? await prisma.article.findUnique({ where: { id } }) : null;
    const data = {
      ...rest,
      coverUrl: coverUrl || null,
      // păstrăm data publicării inițiale dacă articolul era deja public
      publishedAt: published ? (existing?.publishedAt ?? new Date()) : null,
    };

    const saved = id
      ? await prisma.article.update({ where: { id }, data })
      : await prisma.article.create({ data });

    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: id ? "ARTICLE_UPDATED" : "ARTICLE_CREATED",
        entity: "Article",
        entityId: saved.id,
      },
    });
    return jsonOk({ id: saved.id });
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") return jsonError("SLUG_TAKEN", 409);
    return handleApiError(e);
  }
}
