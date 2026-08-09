import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";

export async function POST() {
  try {
    const user = await requireUser();
    await prisma.notification.updateMany({
      where: { userId: user.id, readAt: null },
      data: { readAt: new Date() },
    });
    return jsonOk();
  } catch (e) {
    return handleApiError(e);
  }
}
