import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { SAFE_IMAGE_URL } from "@/lib/limits";
import { jsonOk, handleApiError, jsonValidationError } from "@/lib/api";

/**
 * Transportatorii și agenții din pagina „Transport și Agenți".
 *
 * Adresa site-ului se verifică la fel de strict ca la linkurile de concursuri:
 * doar http/https. Altfel, un `javascript:` salvat aici ar rula la fiecare clic.
 */

const optionalUrl = z
  .string()
  .max(300)
  .refine((v) => {
    if (v === "") return true;
    try {
      const u = new URL(v);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  }, "Adresa trebuie să înceapă cu https:// — ex.: https://www.facebook.com/lucapigeons")
  .optional()
  .or(z.literal(""));

const phoneField = z
  .string()
  .max(40)
  .regex(/^[+0-9 ()./-]*$/, "Doar cifre, spații și +. Ex.: +40 723 137 787")
  .optional();

const schema = z.object({
  id: z.string().max(40).optional(),
  kind: z.enum(["TRANSPORT", "AGENT"]),
  name: z.string().trim().min(2, "Scrie numele firmei sau al persoanei.").max(120),
  zone: z.string().max(200).optional(),
  descRo: z.string().max(8000).optional(),
  descEn: z.string().max(8000).optional(),
  phone: phoneField,
  whatsapp: phoneField,
  email: z
    .union([z.literal(""), z.string().email("Adresa de e-mail nu e scrisă corect.").max(120)])
    .optional(),
  website: optionalUrl,
  logoUrl: z
    .string()
    .max(300)
    .regex(SAFE_IMAGE_URL, "Alege poza cu butonul de mai jos.")
    .optional()
    .or(z.literal("")),
  sortIdx: z.number().int().min(0).max(1000),
  active: z.boolean(),
});

/** câmpurile lăsate goale se țin ca „lipsă", nu ca text gol */
const orNull = (v: string | undefined) => (v && v.trim() ? v.trim() : null);

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    const body = schema.safeParse(await req.json());
    if (!body.success) return jsonValidationError(body.error);

    const { id, ...d } = body.data;
    const data = {
      kind: d.kind,
      name: d.name,
      zone: orNull(d.zone),
      descRo: orNull(d.descRo),
      descEn: orNull(d.descEn),
      phone: orNull(d.phone),
      whatsapp: orNull(d.whatsapp),
      email: orNull(d.email),
      website: orNull(d.website),
      logoUrl: orNull(d.logoUrl),
      sortIdx: d.sortIdx,
      active: d.active,
    };

    const saved = id
      ? await prisma.shippingAgent.update({ where: { id }, data })
      : await prisma.shippingAgent.create({ data });

    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: id ? "AGENT_UPDATED" : "AGENT_CREATED",
        entity: "ShippingAgent",
        entityId: saved.id,
      },
    });
    return jsonOk({ id: saved.id });
  } catch (e) {
    return handleApiError(e);
  }
}
