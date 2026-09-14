import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { SAFE_IMAGE_URL } from "@/lib/limits";
import { parseDistance } from "@/lib/distance";
import { jsonOk, jsonError, jsonValidationError, handleApiError } from "@/lib/api";

const schema = z.object({
  id: z.string().max(40).optional(),
  slug: z
    .string()
    .min(2)
    .max(120)
    .regex(
      /^[a-z0-9-]+$/,
      "Doar litere mici fără diacritice, cifre și liniuțe. Ex.: concursul-daniel-2026"
    ),
  titleRo: z.string().min(3).max(200),
  titleEn: z.string().min(3).max(200),
  descRo: z.string().max(4000).optional(),
  descEn: z.string().max(4000).optional(),
  rulesRo: z.string().max(20_000).optional(),
  rulesEn: z.string().max(20_000).optional(),
  coverUrl: z
    .string()
    .max(300)
    .regex(SAFE_IMAGE_URL, "Alege poza cu butonul de mai jos; o adresă din alt site nu e acceptată.")
    .optional()
    .or(z.literal("")),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  status: z.enum(["UPCOMING", "ACTIVE", "FINISHED"]),
  published: z.boolean(),
  featured: z.boolean().optional(),
  // banda de pe prima pagina — toate optionale
  destination: z.string().max(80).optional(),
  // „200" sau „170-240" — crescătorii nu pleacă toți din același loc
  distance: z.string().max(40).optional(),
  countryCode: z
    .string()
    .regex(/^[A-Za-z]{2}$/, "Exact două litere: RO, DE, HU…")
    .optional()
    .or(z.literal("")),
  boardingAt: z.string().datetime().optional().or(z.literal("")),
  boardingPlace: z.string().max(80).optional(),
  releaseAt: z.string().datetime().optional().or(z.literal("")),
  sloganRo: z.string().max(200).optional(),
  sloganEn: z.string().max(200).optional(),
});

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    const body = schema.safeParse(await req.json());
    if (!body.success) return jsonValidationError(body.error);
    const {
      id,
      coverUrl,
      startsAt,
      endsAt,
      boardingAt,
      releaseAt,
      countryCode,
      distance,
      ...rest
    } = body.data;

    const interval = parseDistance(distance ?? "");
    if (interval === "INVALID") {
      return jsonError("VALIDATION", 422, {
        fields: { distance: "Scrie un număr (200) sau un interval (170-240), în kilometri." },
      });
    }

    if (new Date(endsAt) <= new Date(startsAt)) {
      return jsonError("VALIDATION", 422, {
        fields: { endsAt: "Data de sfârșit trebuie să fie după cea de început." },
      });
    }

    const data = {
      ...rest,
      coverUrl: coverUrl || null,
      startsAt: new Date(startsAt),
      endsAt: new Date(endsAt),
      boardingAt: boardingAt ? new Date(boardingAt) : null,
      releaseAt: releaseAt ? new Date(releaseAt) : null,
      countryCode: countryCode ? countryCode.toUpperCase() : null,
      distanceKm: interval?.min ?? null,
      distanceMaxKm: interval?.max ?? null,
    };

    const saved = id
      ? await prisma.contest.update({ where: { id }, data })
      : await prisma.contest.create({ data });

    // Banda de pe prima pagina e una singura: daca acesta a fost ales, ceilalti
    // se sting. Altfel ar ramane doi „alesi" si ar decide iar intamplarea.
    if (data.featured) {
      await prisma.contest.updateMany({
        where: { id: { not: saved.id }, featured: true },
        data: { featured: false },
      });
    }

    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: id ? "CONTEST_UPDATED" : "CONTEST_CREATED",
        entity: "Contest",
        entityId: saved.id,
      },
    });
    return jsonOk({ id: saved.id });
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") return jsonError("SLUG_TAKEN", 409);
    return handleApiError(e);
  }
}
