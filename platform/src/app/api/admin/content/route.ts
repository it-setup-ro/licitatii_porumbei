import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";

const schema = z.object({
  slug: z.string().min(1).max(60),
  titleRo: z.string().min(1).max(200),
  titleEn: z.string().min(1).max(200),
  bodyRo: z.string().min(1).max(50_000),
  bodyEn: z.string().min(1).max(50_000),
});

/** Salvează o pagină de conținut (regulament, despre noi, contact…). */
export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    const body = schema.safeParse(await req.json());
    if (!body.success) return jsonError("VALIDATION", 422);
    const { slug, ...data } = body.data;

    const existing = await prisma.contentPage.findUnique({ where: { slug } });
    if (!existing) return jsonError("NOT_FOUND", 404);

    await prisma.$transaction([
      prisma.contentPage.update({ where: { slug }, data }),
      prisma.auditLog.create({
        data: {
          actorId: admin.id,
          action: "CONTENT_PAGE_UPDATED",
          entity: "ContentPage",
          entityId: slug,
        },
      }),
    ]);
    return jsonOk();
  } catch (e) {
    return handleApiError(e);
  }
}
