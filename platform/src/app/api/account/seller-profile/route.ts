import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";

/**
 * Crescatorul isi corecteaza datele publice ale crescatoriei.
 *
 * Doar ce se vede pe site: denumirea, localitatea, prezentarea. IBAN-ul si
 * CUI-ul nu se schimba de aici — sunt date de plata, iar o modificare tacuta
 * a contului bancar e exact tiparul unei fraude. Acelea raman la admin.
 */

const schema = z.object({
  sellerCompany: z.string().min(2).max(200),
  sellerCity: z.string().max(80),
  sellerBio: z.string().max(2000),
});

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    if (user.role !== "ADMIN" && user.sellerStatus !== "APPROVED") {
      return jsonError("FORBIDDEN", 403);
    }

    const body = schema.safeParse(await req.json());
    if (!body.success) return jsonError("VALIDATION", 422);

    await prisma.user.update({ where: { id: user.id }, data: body.data });
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: "SELLER_PROFILE_UPDATED",
        entity: "User",
        entityId: user.id,
        dataJson: JSON.stringify(body.data),
      },
    });
    return jsonOk();
  } catch (e) {
    return handleApiError(e);
  }
}
