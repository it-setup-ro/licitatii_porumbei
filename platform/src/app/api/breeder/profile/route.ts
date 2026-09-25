import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireBreeder } from "@/lib/breeder-access";
import { nicknameSchema } from "@/lib/nickname";
import { SAFE_IMAGE_URL } from "@/lib/limits";
import { jsonOk, jsonError, handleApiError, jsonValidationError } from "@/lib/api";

/**
 * Fișa mea, scrisă de crescător: poza, localitatea, povestea, rezultatele și
 * aliasul cu care apare pe site.
 *
 * Numele crescătorului nu se schimbă de aici: el ține de titlurile licitațiilor
 * și de tot ce s-a vândut până acum — îl schimbă administratorul, dacă trebuie.
 */

const text = (max: number) => z.string().max(max).optional();

const schema = z.object({
  alias: nicknameSchema,
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
  // formularul o trimite mereu; lipsa ei nu opreste salvarea restului fisei
  notifyByEmail: z.boolean().default(true),
});

const orNull = (v: string | undefined) => (v && v.trim() ? v.trim() : null);

export async function POST(req: Request) {
  try {
    const { user, breeder } = await requireBreeder();
    const body = schema.safeParse(await req.json());
    if (!body.success) return jsonValidationError(body.error);
    const d = body.data;

    if (d.alias !== user.nickname) {
      try {
        await prisma.user.update({ where: { id: user.id }, data: { nickname: d.alias } });
      } catch (e) {
        // aliasul e unic pe site: doi crescători nu pot apărea la fel
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
          return jsonError("VALIDATION", 422, {
            fields: { alias: "Aliasul e luat. Alege altul." },
          });
        }
        throw e;
      }
    }

    await prisma.breeder.update({
      where: { id: breeder.id },
      data: {
        city: orNull(d.city),
        country: orNull(d.country),
        photoUrl: orNull(d.photoUrl),
        storyRo: orNull(d.storyRo),
        storyEn: orNull(d.storyEn),
        resultsRo: orNull(d.resultsRo),
        resultsEn: orNull(d.resultsEn),
        notifyByEmail: d.notifyByEmail,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: "BREEDER_PROFILE_UPDATED",
        entity: "Breeder",
        entityId: breeder.id,
      },
    });
    return jsonOk();
  } catch (e) {
    return handleApiError(e);
  }
}
