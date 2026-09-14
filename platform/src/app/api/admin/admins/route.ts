import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError, jsonValidationError } from "@/lib/api";

/**
 * Dă drepturi de administrator unui cont existent.
 *
 * Clientul lucrează cu doi administratori, cu aceleași drepturi. Contul trebuie
 * să existe deja: omul își face cont normal, apoi primește drepturile de aici.
 * Drepturile se verifică la fiecare cerere din baza de date, deci au efect
 * imediat, fără reautentificare.
 */

const schema = z.object({
  email: z.string().trim().toLowerCase().email("Adresa de e-mail nu e scrisă corect.").max(200),
});

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    const body = schema.safeParse(await req.json());
    if (!body.success) return jsonValidationError(body.error);

    const user = await prisma.user.findUnique({ where: { email: body.data.email } });
    if (!user) {
      return jsonError("VALIDATION", 422, {
        fields: { email: "Nu există niciun cont cu această adresă. Omul își face întâi cont." },
      });
    }
    if (user.suspendedAt) {
      return jsonError("VALIDATION", 422, { fields: { email: "Contul acesta e suspendat." } });
    }
    if (user.role === "ADMIN") {
      return jsonError("VALIDATION", 422, { fields: { email: "Contul e deja administrator." } });
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          role: "ADMIN",
          accountStatus: "APPROVED",
          accountReviewedAt: new Date(),
          accountReviewedById: admin.id,
        },
      }),
      prisma.auditLog.create({
        data: {
          actorId: admin.id,
          action: "ADMIN_GRANTED",
          entity: "User",
          entityId: user.id,
          dataJson: JSON.stringify({ rolInainte: user.role }),
        },
      }),
    ]);
    return jsonOk({ id: user.id });
  } catch (e) {
    return handleApiError(e);
  }
}
