import { z } from "zod";
import { prisma } from "@/lib/db";
import { alertAdmin } from "@/lib/alerts";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { jsonOk, jsonError, jsonTooManyRequests, handleApiError, validationFields } from "@/lib/api";
import { sendEmail } from "@/lib/mailer";
import { getSettings } from "@/lib/settings";
import { LOCALES } from "@/lib/locales";

/**
 * „Vreau să organizez o licitație", de pe prima pagină.
 *
 * Cererea se salvează și pleacă și pe e-mail la adresa de contact: dacă
 * e-mailul nu ajunge, crescătorul tot apare în Administrare → Cereri licitație.
 */

const schema = z.object({
  name: z.string().trim().min(2, "Scrie numele și prenumele.").max(120),
  phone: z.string().trim().min(5, "Scrie un număr de telefon.").max(40),
  email: z.string().trim().email("Adresa de e-mail nu pare corectă.").toLowerCase().max(160),
  place: z.string().trim().min(2, "Scrie țara și localitatea.").max(160),
  locale: z.enum(LOCALES).default("ro"),
});

export async function POST(req: Request) {
  try {
    const limit = rateLimit(`auction-request:${clientIp(req)}`, 5, 60 * 60_000);
    if (!limit.allowed) return jsonTooManyRequests(limit.retryAfterSeconds);

    const body = schema.safeParse(await req.json());
    if (!body.success) return jsonError("VALIDATION", 422, { fields: validationFields(body.error) });
    const d = body.data;

    const saved = await prisma.auctionRequest.create({
      data: { name: d.name, phone: d.phone, email: d.email, place: d.place, locale: d.locale },
    });

    const settings = await getSettings();
    if (settings.emailEnabled && settings.contactEmail) {
      await sendEmail({
        to: settings.contactEmail,
        subject: `Cerere de licitație: ${d.name}`,
        text: [
          "Cineva vrea să organizeze o licitație:",
          "",
          `Nume: ${d.name}`,
          `Telefon: ${d.phone}`,
          `E-mail: ${d.email}`,
          `Țara / localitatea: ${d.place}`,
          `Limba site-ului: ${d.locale}`,
          "",
          "Cererea e și în Administrare → Cereri licitație.",
        ].join("\n"),
      });
    }

    await alertAdmin("AUCTION_REQUEST", {
      titlu: d.name,
      linii: [`Telefon: ${d.phone}`, `E-mail: ${d.email}`, `Locul: ${d.place}`],
      cale: "/ro/admin/auction-requests",
    });

    return jsonOk({ id: saved.id });
  } catch (e) {
    return handleApiError(e);
  }
}
