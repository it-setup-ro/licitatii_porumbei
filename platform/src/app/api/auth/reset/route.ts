import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword, destroySession } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { hashToken, passwordSchema } from "@/lib/password";
import { jsonOk, jsonError, jsonTooManyRequests, handleApiError } from "@/lib/api";

/**
 * Schimbă parola pe baza tokenului din link.
 *
 * Tokenul e de unică folosință și expiră; la reușită se anulează și celelalte
 * linkuri ale utilizatorului. Nu autentificăm automat după resetare — cine
 * ajunge la link trebuie să știe și noua parolă ca să intre.
 */

const schema = z.object({
  token: z.string().min(32).max(200),
  password: passwordSchema,
});

export async function POST(req: Request) {
  try {
    const check = rateLimit(`reset:${clientIp(req)}`, 20, 60 * 60_000);
    if (!check.allowed) return jsonTooManyRequests(check.retryAfterSeconds);

    const body = schema.safeParse(await req.json());
    if (!body.success) {
      const issue = body.error.issues.find((i) => i.path[0] === "password");
      return jsonError(issue ? "WEAK_PASSWORD" : "VALIDATION", 422, {
        message: issue?.message,
      });
    }

    const row = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(body.data.token) },
      include: { user: true },
    });

    // acelasi raspuns pentru „nu exista", „deja folosit" si „expirat" —
    // nu are rost sa spunem unui atacator care dintre ele e cazul
    if (!row || row.usedAt || row.expiresAt < new Date()) {
      return jsonError("INVALID_TOKEN", 400);
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: row.userId },
        data: { passwordHash: await hashPassword(body.data.password) },
      }),
      // tokenul folosit + orice alt link ramas deschis pentru acelasi cont
      prisma.passwordResetToken.updateMany({
        where: { userId: row.userId, usedAt: null },
        data: { usedAt: new Date() },
      }),
      prisma.auditLog.create({
        data: {
          actorId: row.userId,
          action: "PASSWORD_RESET",
          entity: "User",
          entityId: row.userId,
          dataJson: JSON.stringify({ issuedBy: row.issuedBy }),
        },
      }),
    ]);

    // daca cineva era logat in acest browser, sesiunea nu mai are ce cauta
    await destroySession();

    return jsonOk({ email: row.user.email });
  } catch (e) {
    return handleApiError(e);
  }
}
