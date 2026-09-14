import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { SAFE_IMAGE_URL } from "@/lib/limits";
import { jsonOk, jsonError, handleApiError, jsonValidationError } from "@/lib/api";

/**
 * Licitațiile crescătorilor: crearea și editarea datelor de prezentare.
 *
 * Comisionul se poate schimba oricând, și după pornire: e o înțelegere între
 * administrator și crescător, pe care cumpărătorul nu o vede și nu o plătește.
 * Fiecare schimbare rămâne în jurnal, cu valoarea veche și cea nouă.
 */

const schema = z.object({
  id: z.string().max(40).optional(),
  breederId: z.string().min(1, "Alege crescătorul.").max(40),
  slug: z
    .string()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9-]+$/, "Doar litere mici fără diacritice, cifre și liniuțe."),
  titleRo: z.string().trim().min(3, "Scrie titlul licitației.").max(200),
  titleEn: z.string().trim().min(3, "Scrie titlul în engleză.").max(200),
  descRo: z.string().max(20_000).optional(),
  descEn: z.string().max(20_000).optional(),
  coverUrl: z
    .string()
    .max(300)
    .regex(SAFE_IMAGE_URL, "Alege poza cu butonul de mai jos.")
    .optional()
    .or(z.literal("")),
  commissionPercent: z
    .number({ message: "Scrie comisionul în procente." })
    .min(0, "Comisionul nu poate fi negativ.")
    .max(100, "Comisionul nu poate trece de 100%."),
});

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    const body = schema.safeParse(await req.json());
    if (!body.success) return jsonValidationError(body.error);

    const { id, coverUrl, descRo, descEn, ...rest } = body.data;

    const breeder = await prisma.breeder.findUnique({ where: { id: rest.breederId } });
    if (!breeder) {
      return jsonError("VALIDATION", 422, { fields: { breederId: "Crescătorul nu există." } });
    }

    const before = id ? await prisma.sale.findUnique({ where: { id } }) : null;
    if (id && !before) return jsonError("NOT_FOUND", 404);

    const data = {
      ...rest,
      coverUrl: coverUrl || null,
      descRo: descRo?.trim() || null,
      descEn: descEn?.trim() || descRo?.trim() || null,
    };

    const saved = id
      ? await prisma.sale.update({ where: { id }, data })
      : await prisma.sale.create({ data: { ...data, createdById: admin.id } });

    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: id ? "SALE_UPDATED" : "SALE_CREATED",
        entity: "Sale",
        entityId: saved.id,
        dataJson:
          before && before.commissionPercent !== saved.commissionPercent
            ? JSON.stringify({
                comision: { inainte: before.commissionPercent, acum: saved.commissionPercent },
              })
            : null,
      },
    });
    return jsonOk({ id: saved.id });
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") {
      return jsonError("VALIDATION", 422, {
        fields: { slug: "Identificatorul e deja folosit de altă licitație." },
      });
    }
    return handleApiError(e);
  }
}
