import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { contactSchema, contactToDb } from "@/lib/address";
import { jsonOk, handleApiError, jsonValidationError } from "@/lib/api";

/**
 * Telefonul, adresa și alegerea avizelor, din Contul meu.
 */

const schema = contactSchema.extend({
  notifyAuctionEnding: z.boolean(),
});

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = schema.safeParse(await req.json());
    if (!body.success) return jsonValidationError(body.error);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        ...contactToDb(body.data),
        notifyAuctionEnding: body.data.notifyAuctionEnding,
      },
    });
    return jsonOk();
  } catch (e) {
    return handleApiError(e);
  }
}
