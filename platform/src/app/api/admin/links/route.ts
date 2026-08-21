import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";

/**
 * Linkurile externe din submeniul „Concursuri".
 *
 * Validarea URL-ului e strictă: doar http/https. Fără asta, un `javascript:...`
 * salvat aici ar deveni cod executabil pentru fiecare vizitator care dă clic.
 */
const schema = z.object({
  id: z.string().max(40).optional(),
  group: z.enum(["CONTESTS"]).default("CONTESTS"),
  labelRo: z.string().min(1).max(120),
  labelEn: z.string().min(1).max(120),
  url: z
    .string()
    .max(500)
    .refine((v) => {
      if (v === "") return true;
      try {
        const parsed = new URL(v);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
      } catch {
        return false;
      }
    }, "adresa trebuie să înceapă cu http:// sau https://")
    .optional()
    .or(z.literal("")),
  sortIdx: z.number().int().min(0).max(1000),
  active: z.boolean(),
});

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    const body = schema.safeParse(await req.json());
    if (!body.success) return jsonError("VALIDATION", 422);
    const { id, url, ...rest } = body.data;
    // gol => intrare inactivă, afișată cu „în curând"
    const data = { ...rest, url: url && url.length > 0 ? url : null };

    const saved = id
      ? await prisma.externalLink.update({ where: { id }, data })
      : await prisma.externalLink.create({ data });

    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: id ? "LINK_UPDATED" : "LINK_CREATED",
        entity: "ExternalLink",
        entityId: saved.id,
      },
    });
    return jsonOk({ id: saved.id });
  } catch (e) {
    return handleApiError(e);
  }
}
