import { z } from "zod";
import { prisma } from "@/lib/db";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { jsonOk, jsonError, jsonTooManyRequests, handleApiError } from "@/lib/api";

const schema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(200),
  subject: z.string().min(3).max(200),
  message: z.string().min(10).max(4000),
});

/** Formularul de contact. Public, deci limitat strict ca rată (anti-spam). */
export async function POST(req: Request) {
  try {
    const check = rateLimit(`contact:${clientIp(req)}`, 5, 60 * 60_000);
    if (!check.allowed) return jsonTooManyRequests(check.retryAfterSeconds);

    const body = schema.safeParse(await req.json());
    if (!body.success) return jsonError("VALIDATION", 422);

    await prisma.contactMessage.create({ data: body.data });
    return jsonOk();
  } catch (e) {
    return handleApiError(e);
  }
}
