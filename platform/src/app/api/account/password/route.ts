import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, hashPassword, verifyPassword } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { passwordSchema } from "@/lib/password";
import { jsonOk, jsonError, jsonTooManyRequests, handleApiError } from "@/lib/api";

/**
 * Schimbarea parolei de către cine e deja autentificat.
 *
 * Se cere parola veche: altfel, un calculator lăsat deschis cu sesiunea pornită
 * i-ar permite oricui trece pe lângă el să preia contul definitiv.
 */

const schema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: passwordSchema,
});

export async function POST(req: Request) {
  try {
    const user = await requireUser();

    const check = rateLimit(`chpass:${user.id}:${clientIp(req)}`, 10, 60 * 60_000);
    if (!check.allowed) return jsonTooManyRequests(check.retryAfterSeconds);

    const body = schema.safeParse(await req.json());
    if (!body.success) {
      const issue = body.error.issues.find((i) => i.path[0] === "newPassword");
      return jsonError(issue ? "WEAK_PASSWORD" : "VALIDATION", 422, {
        message: issue?.message,
      });
    }

    if (!(await verifyPassword(body.data.currentPassword, user.passwordHash))) {
      return jsonError("WRONG_PASSWORD", 400);
    }
    if (body.data.currentPassword === body.data.newPassword) {
      return jsonError("SAME_PASSWORD", 400);
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: await hashPassword(body.data.newPassword) },
      }),
      // orice link de resetare cerut inainte nu mai are rost
      prisma.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      }),
      prisma.auditLog.create({
        data: {
          actorId: user.id,
          action: "PASSWORD_CHANGED",
          entity: "User",
          entityId: user.id,
        },
      }),
    ]);

    return jsonOk();
  } catch (e) {
    return handleApiError(e);
  }
}
