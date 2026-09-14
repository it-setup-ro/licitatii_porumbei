import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { SAFE_IMAGE_URL } from "@/lib/limits";
import { jsonOk, handleApiError, jsonValidationError } from "@/lib/api";

/**
 * Crescătorii — profilurile celor care vând. Le face doar administratorul.
 */

const text = (max: number) => z.string().max(max).optional();

const schema = z.object({
  id: z.string().max(40).optional(),
  name: z.string().trim().min(2, "Scrie numele crescătorului.").max(120),
  city: text(80),
  country: text(80),
  photoUrl: z
    .string()
    .max(300)
    .regex(SAFE_IMAGE_URL, "Alege poza cu butonul de mai jos.")
    .optional()
    .or(z.literal("")),
  storyRo: text(20_000),
  storyEn: text(20_000),
  resultsRo: text(20_000),
  resultsEn: text(20_000),
});

const orNull = (v: string | undefined) => (v && v.trim() ? v.trim() : null);

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    const body = schema.safeParse(await req.json());
    if (!body.success) return jsonValidationError(body.error);

    const { id, ...d } = body.data;
    const data = {
      name: d.name,
      city: orNull(d.city),
      country: orNull(d.country),
      photoUrl: orNull(d.photoUrl),
      storyRo: orNull(d.storyRo),
      storyEn: orNull(d.storyEn),
      resultsRo: orNull(d.resultsRo),
      resultsEn: orNull(d.resultsEn),
    };

    const saved = id
      ? await prisma.breeder.update({ where: { id }, data })
      : await prisma.breeder.create({ data });

    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: id ? "BREEDER_UPDATED" : "BREEDER_CREATED",
        entity: "Breeder",
        entityId: saved.id,
      },
    });
    return jsonOk({ id: saved.id });
  } catch (e) {
    return handleApiError(e);
  }
}
