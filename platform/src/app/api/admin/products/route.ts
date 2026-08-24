import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { MAX_MONEY_CENTS, SAFE_IMAGE_URL } from "@/lib/limits";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";

const productSchema = z.object({
  id: z.string().max(40).optional(), // lipsă = produs nou
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "doar litere mici, cifre și cratime"),
  nameRo: z.string().min(2).max(160),
  nameEn: z.string().min(2).max(160),
  descRo: z.string().max(2000).optional(),
  descEn: z.string().max(2000).optional(),
  category: z.enum(["FEED", "SUPPLEMENTS", "ACCESSORIES", "RINGS", "OTHER"]),
  priceCents: z.number().int().positive().max(MAX_MONEY_CENTS),
  stock: z.number().int().min(0).max(100_000),
  imageUrl: z.string().max(300).regex(SAFE_IMAGE_URL).optional().or(z.literal("")),
  active: z.boolean(),
  sortIdx: z.number().int().min(0).max(1000),
});

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    const body = productSchema.safeParse(await req.json());
    if (!body.success) return jsonError("VALIDATION", 422, { issues: body.error.issues.length });
    const { id, imageUrl, ...rest } = body.data;
    const data = { ...rest, imageUrl: imageUrl || null };

    const saved = id
      ? await prisma.product.update({ where: { id }, data })
      : await prisma.product.create({ data });

    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: id ? "PRODUCT_UPDATED" : "PRODUCT_CREATED",
        entity: "Product",
        entityId: saved.id,
      },
    });
    return jsonOk({ id: saved.id });
  } catch (e) {
    // slug duplicat
    if ((e as { code?: string }).code === "P2002") return jsonError("SLUG_TAKEN", 409);
    return handleApiError(e);
  }
}
