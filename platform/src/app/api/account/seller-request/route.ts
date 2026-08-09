import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";

const schema = z.object({
  sellerCompany: z.string().min(2).max(200),
  sellerCui: z.string().max(40).optional(),
  sellerIban: z.string().min(10).max(40),
  sellerBio: z.string().max(2000).optional(),
});

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    if (user.role === "ADMIN") return jsonError("FORBIDDEN", 403);
    if (user.sellerStatus === "APPROVED") return jsonError("ALREADY_SELLER", 400);

    const body = schema.safeParse(await req.json());
    if (!body.success) return jsonError("VALIDATION", 422);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        role: "SELLER",
        sellerStatus: "PENDING",
        ...body.data,
      },
    });
    return jsonOk();
  } catch (e) {
    return handleApiError(e);
  }
}
