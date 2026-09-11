import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";

/**
 * Dezabonare pe baza tokenului din link.
 *
 * Nu se cere autentificare — omul care vrea sa scape de e-mailuri nu trebuie
 * pus sa-si aminteasca o parola. Tokenul tine loc de dovada.
 */

const schema = z.object({ token: z.string().min(10).max(100) });

export async function POST(req: Request) {
  try {
    const body = schema.safeParse(await req.json());
    if (!body.success) return jsonError("VALIDATION", 422);

    const row = await prisma.newsletterSubscriber.findUnique({
      where: { unsubToken: body.data.token },
    });
    if (!row) return jsonError("NOT_FOUND", 404);

    if (!row.unsubscribedAt) {
      await prisma.newsletterSubscriber.update({
        where: { id: row.id },
        data: { unsubscribedAt: new Date() },
      });
    }
    return jsonOk();
  } catch (e) {
    return handleApiError(e);
  }
}
