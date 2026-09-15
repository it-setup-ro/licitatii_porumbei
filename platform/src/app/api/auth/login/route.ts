import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword, createSessionCookie } from "@/lib/auth";
import { clientIp, rateLimit, resetLimit } from "@/lib/rate-limit";
import { jsonOk, jsonError, jsonTooManyRequests, handleApiError } from "@/lib/api";

/**
 * Autentificarea, cu e-mailul sau cu numele de utilizator — clientul a cerut
 * „nume de utilizator", ca pe celelalte site-uri de licitații. Câmpul din cerere
 * se numește tot `email`, ca aplicațiile și testele existente să meargă mai departe.
 */
const schema = z.object({
  email: z.string().trim().min(2).max(200),
  password: z.string().min(1).max(200),
});

// Anti-bruteforce: 10 incercari / 15 min per IP si 5 per cont.
// Limita pe cont opreste atacul distribuit pe mai multe IP-uri catre acelasi cont.
const WINDOW_MS = 15 * 60_000;

export async function POST(req: Request) {
  try {
    const body = schema.safeParse(await req.json());
    if (!body.success) return jsonError("VALIDATION", 422);

    const identifier = body.data.email.toLowerCase();
    const ipKey = `login:ip:${clientIp(req)}`;
    const accountKey = `login:email:${identifier}`;
    for (const [key, max] of [
      [ipKey, 10],
      [accountKey, 5],
    ] as const) {
      const check = rateLimit(key, max, WINDOW_MS);
      if (!check.allowed) return jsonTooManyRequests(check.retryAfterSeconds);
    }

    const user = identifier.includes("@")
      ? await prisma.user.findUnique({ where: { email: identifier } })
      : await prisma.user.findFirst({
          where: { nickname: { equals: body.data.email, mode: "insensitive" } },
        });
    if (!user || user.suspendedAt) return jsonError("INVALID_CREDENTIALS", 401);
    const valid = await verifyPassword(body.data.password, user.passwordHash);
    if (!valid) return jsonError("INVALID_CREDENTIALS", 401);

    // autentificare reusita — contoarele se sterg, ca sa nu blocam un user legitim
    resetLimit(ipKey);
    resetLimit(accountKey);

    await createSessionCookie(user.id, user.role);
    return jsonOk({ userId: user.id, role: user.role });
  } catch (e) {
    return handleApiError(e);
  }
}
