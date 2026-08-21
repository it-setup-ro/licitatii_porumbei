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
  descRo: z.string().max(4000).optional(),
  descEn: z.string().max(4000).optional(),
  rulesRo: z.string().max(20_000).optional(),
  rulesEn: z.string().max(20_000).optional(),
  coverUrl: z.string().max(300).regex(SAFE_MEDIA_URL).optional().or(z.literal("")),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  status: z.enum(["UPCOMING", "ACTIVE", "FINISHED"]),
  published: z.boolean(),
});

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    const body = schema.safeParse(await req.json());
    if (!body.success) return jsonError("VALIDATION", 422);
    const { id, coverUrl, startsAt, endsAt, ...rest } = body.data;

    if (new Date(endsAt) <= new Date(startsAt)) return jsonError("END_BEFORE_START", 400);

    const data = {
      ...rest,
      coverUrl: coverUrl || null,
      startsAt: new Date(startsAt),
      endsAt: new Date(endsAt),
    };

    const saved = id
      ? await prisma.contest.update({ where: { id }, data })
      : await prisma.contest.create({ data });

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
