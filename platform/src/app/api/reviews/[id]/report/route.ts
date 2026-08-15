import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { jsonOk, jsonError, jsonTooManyRequests, handleApiError } from "@/lib/api";

const schema = z.object({ reason: z.string().min(3).max(500) });

/**
 * Raportarea trimite recenzia in coada de moderare, DAR NU o ascunde.
 * Inainte, orice utilizator logat putea face sa dispara instant orice recenzie
 * (un vanzator isi stergea toate recenziile de 1 stea, cu cate un request).
 * Acum doar adminul poate schimba vizibilitatea, din /admin/reviews.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;

    const check = rateLimit(`report:${user.id}`, 10, 60 * 60_000);
    if (!check.allowed) return jsonTooManyRequests(check.retryAfterSeconds);

    const body = schema.safeParse(await req.json());
    if (!body.success) return jsonError("VALIDATION", 422);

    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) return jsonError("NOT_FOUND", 404);

    // vanzatorul recenzat nu-si poate raporta singur recenziile primite
    if (review.sellerId === user.id) return jsonError("FORBIDDEN", 403);
    // o recenzie deja analizata de admin nu se redeschide prin raportari repetate
    if (review.moderNote) return jsonOk({ alreadyModerated: true });
    if (review.reportedAt) return jsonOk({ alreadyReported: true });

    await prisma.review.update({
      where: { id },
      data: { reportedAt: new Date(), reportReason: body.data.reason },
    });
    return jsonOk();
  } catch (e) {
    return handleApiError(e);
  }
}
