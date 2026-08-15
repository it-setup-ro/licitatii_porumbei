import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword, createSessionCookie } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { jsonOk, jsonError, jsonTooManyRequests, handleApiError } from "@/lib/api";

/** Lista scurta de parole banale — blocheaza cele mai frecvente incercari. */
const COMMON_PASSWORDS = new Set([
  "parola123",
  "password",
  "password1",
  "12345678",
  "123456789",
  "1234567890",
  "qwertyui",
  "qwerty123",
  "iloveyou",
  "admin123",
  "welcome1",
  "parolamea",
]);

const schema = z.object({
  email: z.string().email().toLowerCase().max(200),
  password: z
    .string()
    .min(10, "Parola trebuie să aibă minim 10 caractere")
    .max(200)
    .refine((p) => !COMMON_PASSWORDS.has(p.toLowerCase()), "Parolă prea uzuală")
    .refine((p) => !/^(.)\1+$/.test(p), "Parolă prea simplă"),
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
    // anti-spam: maxim 5 conturi noi pe ora de la acelasi IP
    // (ridicat doar in suita e2e, care creeaza multe conturi de test)
    const maxPerHour = Number(process.env.RATE_LIMIT_REGISTER_PER_HOUR ?? 5);
    const check = rateLimit(`register:${clientIp(req)}`, maxPerHour, 60 * 60_000);
    if (!check.allowed) return jsonTooManyRequests(check.retryAfterSeconds);

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
