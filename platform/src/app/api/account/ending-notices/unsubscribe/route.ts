import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyEndingUnsubscribe } from "@/lib/ending-unsubscribe";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";

/**
 * Oprește avizele „se încheie o licitație", din linkul semnat din e-mail.
 *
 * Cere o apăsare pe buton, nu doar deschiderea linkului: clienții de e-mail și
 * scanerele de securitate deschid singure linkurile și ar dezabona oameni care
 * n-au cerut nimic.
 */

const schema = z.object({ u: z.string().min(1).max(40), t: z.string().min(1).max(100) });

export async function POST(req: Request) {
  try {
    const body = schema.safeParse(await req.json());
    if (!body.success) return jsonError("VALIDATION", 422);
    if (!verifyEndingUnsubscribe(body.data.u, body.data.t)) return jsonError("INVALID_LINK", 400);

    const r = await prisma.user.updateMany({
      where: { id: body.data.u },
      data: { notifyAuctionEnding: false },
    });
    if (r.count === 0) return jsonError("INVALID_LINK", 400);
    return jsonOk();
  } catch (e) {
    return handleApiError(e);
  }
}
