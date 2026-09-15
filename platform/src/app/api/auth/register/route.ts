import { prisma } from "@/lib/db";
import { hashPassword, createSessionCookie } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { getSettings } from "@/lib/settings";
import { registrationSchema, registrationToDb } from "@/lib/registration";
import { verifyCaptcha } from "@/lib/captcha";
import { consentTextFor, newUnsubToken } from "@/lib/newsletter";
import { jsonOk, jsonError, jsonTooManyRequests, handleApiError, validationFields } from "@/lib/api";

/**
 * Contul nou.
 *
 * Datele cerute urmează exemplele clientului (voiajor.net, columbofil.net):
 * persoană fizică sau juridică, nume și prenume, nume de utilizator, contact,
 * adresă, datele firmei la juridică, acordul pentru termeni și bifa „Nu sunt
 * robot". Cu aprobarea conturilor pornită, contul intră în „așteaptă aprobarea":
 * omul vede licitațiile de la început, dar licitează abia după aprobare.
 */

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

    // erorile câmpurilor și ale bifei „Nu sunt robot" se întorc deodată,
    // ca omul să le repare dintr-o singură trecere
    const body = registrationSchema.safeParse(raw);
    const human = await verifyCaptcha(raw?.captcha);
    if (!body.success || !human) {
      return jsonError(body.success ? "CAPTCHA" : "VALIDATION", 422, {
        fields: {
          ...(!body.success ? validationFields(body.error) : {}),
          ...(!human ? { captcha: "Bifează „Nu sunt robot” și așteaptă să apară verificat." } : {}),
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
        fields: { nickname: "Numele de utilizator e deja folosit de altcineva." },
      });
    }

    // versiunea termenilor acceptați = ultima modificare a paginii, ca să se
    // poată arăta ce text era în vigoare în ziua în care omul a bifat
    const terms = await prisma.contentPage.findUnique({
      where: { slug: "termeni-si-conditii" },
      select: { updatedAt: true },
    });

    // cererea de cont de crescător — doar cât fluxul vechi e pornit din Setări
    const wantsSeller = d.wantsSeller && settings.breederSelfServiceEnabled;

    const user = await prisma.user.create({
      data: {
        email: d.email,
        passwordHash: await hashPassword(d.password),
        nickname: d.nickname,
        ...registrationToDb(d),
        termsAcceptedAt: new Date(),
        termsVersion: terms ? terms.updatedAt.toISOString() : null,
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

    // bifa „Doresc să primesc noutăți despre licitații pe email"
    if (d.notifyAuctionEnding) {
      const consentText = consentTextFor(d.locale);
      await prisma.newsletterSubscriber.upsert({
        where: { email: d.email },
        update: { locale: d.locale, consentAt: new Date(), consentText, unsubscribedAt: null },
        create: { email: d.email, locale: d.locale, consentText, unsubToken: newUnsubToken() },
      });
    }

    await createSessionCookie(user.id, user.role);
    return jsonOk({ userId: user.id, role: user.role, accountStatus: user.accountStatus });
  } catch (e) {
    return handleApiError(e);
  }
}
