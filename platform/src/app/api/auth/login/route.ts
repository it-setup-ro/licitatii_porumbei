import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword, createSessionCookie } from "@/lib/auth";
import { clientIp, rateLimit, resetLimit } from "@/lib/rate-limit";
import { jsonOk, jsonError, jsonTooManyRequests, handleApiError } from "@/lib/api";

const schema = z.object({
  email: z.string().email().toLowerCase().max(200),
  password: z.string().min(1).max(200),
});

// Anti-bruteforce: 10 incercari / 15 min per IP si 5 per adresa de email.
// Limita pe email opreste atacul distribuit pe mai multe IP-uri catre un cont.
const WINDOW_MS = 15 * 60_000;

export async function POST(req: Request) {
  try {
    const body = schema.safeParse(await req.json());
    if (!body.success) return jsonError("VALIDATION", 422);

    const ipKey = `login:ip:${clientIp(req)}`;
    const emailKey = `login:email:${body.data.email}`;
    for (const [key, max] of [
      [ipKey, 10],
      [emailKey, 5],
    ] as const) {
      const check = rateLimit(key, max, WINDOW_MS);
      if (!check.allowed) return jsonTooManyRequests(check.retryAfterSeconds);
    }

    const user = await prisma.user.findUnique({ where: { email: body.data.email } });
    if (!user || user.suspendedAt) return jsonError("INVALID_CREDENTIALS", 401);
    const valid = await verifyPassword(body.data.password, user.passwordHash);
    if (!valid) return jsonError("INVALID_CREDENTIALS", 401);

    // autentificare reusita — contoarele se sterg, ca sa nu blocam un user legitim
    resetLimit(ipKey);
    resetLimit(emailKey);

    await createSessionCookie(user.id, user.role);
    return jsonOk({ userId: user.id, role: user.role });
  } catch (e) {
    return handleApiError(e);
  }
}
