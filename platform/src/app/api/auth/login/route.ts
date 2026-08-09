import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword, createSessionCookie } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";

const schema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const body = schema.safeParse(await req.json());
    if (!body.success) return jsonError("VALIDATION", 422);

    const user = await prisma.user.findUnique({ where: { email: body.data.email } });
    if (!user || user.suspendedAt) return jsonError("INVALID_CREDENTIALS", 401);
    const valid = await verifyPassword(body.data.password, user.passwordHash);
    if (!valid) return jsonError("INVALID_CREDENTIALS", 401);

    await createSessionCookie(user.id, user.role);
    return jsonOk({ userId: user.id, role: user.role });
  } catch (e) {
    return handleApiError(e);
  }
}
