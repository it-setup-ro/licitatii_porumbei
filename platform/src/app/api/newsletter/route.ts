import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { consentTextFor, newUnsubToken } from "@/lib/newsletter";
import { LOCALES } from "@/lib/locales";

/**
 * Abonare la newsletter.
 *
 * Bifa e obligatorie si se pastreaza cu data si textul ei: fara asta nu avem
 * temei sa trimitem nimic. Raspunsul e acelasi si daca adresa exista deja —
 * altfel formularul ar spune cine e abonat.
 */

const schema = z.object({
  email: z.string().email().max(120),
  consent: z.literal(true),
  locale: z.enum(LOCALES).default("ro"),
});

export async function POST(req: Request) {
  try {
    const limit = rateLimit(`newsletter:${clientIp(req)}`, 5, 60 * 60 * 1000);
    if (!limit.allowed) return jsonError("RATE_LIMITED", 429);

    const body = schema.safeParse(await req.json());
    if (!body.success) return jsonError("VALIDATION", 422);

    const email = body.data.email.trim().toLowerCase();
    const consentText = consentTextFor(body.data.locale);

    await prisma.newsletterSubscriber.upsert({
      where: { email },
      // reabonare: consimtamantul se ia din nou, cu data noua
      update: {
        locale: body.data.locale,
        consentAt: new Date(),
        consentText,
        unsubscribedAt: null,
      },
      create: {
        email,
        locale: body.data.locale,
        consentText,
        unsubToken: newUnsubToken(),
      },
    });

    return jsonOk();
  } catch (e) {
    return handleApiError(e);
  }
}
