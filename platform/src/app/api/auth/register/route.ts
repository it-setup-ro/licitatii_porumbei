import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword, createSessionCookie } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";

const schema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(8),
  name: z.string().min(2).max(120),
  phone: z.string().max(30).optional(),
  locale: z.enum(["ro", "en"]).default("ro"),
  wantsSeller: z.boolean().default(false),
  sellerCompany: z.string().max(200).optional(),
  sellerCui: z.string().max(40).optional(),
  sellerIban: z.string().max(40).optional(),
});

export async function POST(req: Request) {
  try {
    const body = schema.safeParse(await req.json());
    if (!body.success) return jsonError("VALIDATION", 422);
    const d = body.data;

    const existing = await prisma.user.findUnique({ where: { email: d.email } });
    if (existing) return jsonError("EMAIL_TAKEN", 409);

    const user = await prisma.user.create({
      data: {
        email: d.email,
        passwordHash: await hashPassword(d.password),
        name: d.name,
        phone: d.phone,
        locale: d.locale,
        role: d.wantsSeller ? "SELLER" : "BUYER",
        sellerStatus: d.wantsSeller ? "PENDING" : null,
        sellerCompany: d.wantsSeller ? d.sellerCompany : null,
        sellerCui: d.wantsSeller ? d.sellerCui : null,
        sellerIban: d.wantsSeller ? d.sellerIban : null,
      },
    });

    await createSessionCookie(user.id, user.role);
    return jsonOk({ userId: user.id, role: user.role });
  } catch (e) {
    return handleApiError(e);
  }
}
