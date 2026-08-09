import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { notify } from "@/lib/notify";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";

const schema = z.object({
  orderId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
});

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = schema.safeParse(await req.json());
    if (!body.success) return jsonError("VALIDATION", 422);
    const { orderId, rating, comment } = body.data;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { review: true },
    });
    if (!order || order.buyerId !== user.id) return jsonError("NOT_FOUND", 404);
    // doar tranzactii finalizate (platite) pot primi recenzie — client-decisions D18
    if (!["PAID", "SHIPPED", "DELIVERED"].includes(order.status))
      return jsonError("ORDER_NOT_COMPLETED", 400);

    const settings = await getSettings();
    const editableUntil = new Date(Date.now() + settings.reviewEditDays * 86_400_000);

    if (order.review) {
      if (order.review.editableUntil < new Date()) return jsonError("EDIT_WINDOW_CLOSED", 400);
      await prisma.review.update({
        where: { id: order.review.id },
        data: { rating, comment },
      });
      return jsonOk({ reviewId: order.review.id, updated: true });
    }

    const review = await prisma.review.create({
      data: {
        orderId,
        sellerId: order.sellerId,
        authorId: user.id,
        rating,
        comment,
        editableUntil,
      },
    });
    await notify(order.sellerId, "REVIEW_RECEIVED", { rating }, `/sellers/${order.sellerId}`);
    return jsonOk({ reviewId: review.id });
  } catch (e) {
    return handleApiError(e);
  }
}
