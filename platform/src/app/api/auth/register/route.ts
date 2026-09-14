import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword, createSessionCookie } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { nicknameSchema } from "@/lib/nickname";
import { passwordSchema } from "@/lib/password";
import { getSettings } from "@/lib/settings";
import { contactSchema, contactToDb } from "@/lib/address";
import {
  jsonOk,
  jsonError,
  jsonTooManyRequests,
  handleApiError,
  validationFields,
} from "@/lib/api";

/**
 * Contul nou.
 *
 * Cu aprobarea conturilor pornită (cerința clientului), cere și telefonul și
 * adresa, iar contul intră în „așteaptă aprobarea": omul vede licitațiile de la
 * început, dar licitează abia după ce îl aprobă administratorul.
 */

const schema = z.object({
  email: z.string().email("Adresa de e-mail nu e scrisă corect.").toLowerCase().max(200),
  password: passwordSchema,
  name: z.string().trim().min(2, "Scrie numele și prenumele.").max(120),
  nickname: nicknameSchema,
  phone: z.string().max(40).optional(),
  locale: z.enum(["ro", "en"]).default("ro"),
  /** „Vreau un aviz când se încheie o licitație" — pornește nebifat */
  notifyAuctionEnding: z.boolean().default(false),
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

    const settings = await getSettings();
    const strict = settings.accountApprovalRequired;
    const raw = await req.json();

    // datele de bază și, cu aprobarea pornită, telefonul și adresa — erorile
    // din ambele se întorc deodată, ca omul să le repare dintr-o trecere
    const body = schema.safeParse(raw);
    const contact = strict ? contactSchema.safeParse(raw) : null;
    if (!body.success || (contact && !contact.success)) {
      return jsonError("VALIDATION", 422, {
        fields: {
          ...(contact && !contact.success ? validationFields(contact.error) : {}),
          ...(!body.success ? validationFields(body.error) : {}),
        },
      });
    }
    const d = body.data;

    const existing = await prisma.user.findUnique({ where: { email: d.email } });
    if (existing) {
      return jsonError("EMAIL_TAKEN", 409, {
        fields: { email: "Există deja un cont cu această adresă." },
      });
    }

    const nickTaken = await prisma.user.findFirst({
      where: { nickname: { equals: d.nickname, mode: "insensitive" } },
    });
    if (nickTaken) {
      return jsonError("NICKNAME_TAKEN", 409, {
        fields: { nickname: "Porecla e deja folosită de altcineva." },
      });
    }

    // cererea de cont de crescător — doar cât fluxul vechi e pornit din Setări
    const wantsSeller = d.wantsSeller && settings.breederSelfServiceEnabled;

    const user = await prisma.user.create({
      data: {
        email: d.email,
        passwordHash: await hashPassword(d.password),
        name: d.name,
        nickname: d.nickname,
        phone: d.phone || null,
        ...(contact && contact.success ? contactToDb(contact.data) : {}),
        notifyAuctionEnding: d.notifyAuctionEnding,
        accountStatus: strict ? "PENDING" : "APPROVED",
        locale: d.locale,
        role: wantsSeller ? "SELLER" : "BUYER",
        sellerStatus: wantsSeller ? "PENDING" : null,
        sellerCompany: wantsSeller ? d.sellerCompany : null,
        sellerCui: wantsSeller ? d.sellerCui : null,
        sellerIban: wantsSeller ? d.sellerIban : null,
      },
    });

    await createSessionCookie(user.id, user.role);
    return jsonOk({ userId: user.id, role: user.role, accountStatus: user.accountStatus });
  } catch (e) {
    return handleApiError(e);
  }
}
