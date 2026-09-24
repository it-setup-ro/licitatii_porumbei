import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError, jsonValidationError } from "@/lib/api";
import { countSubscribers, createCampaign } from "@/lib/newsletter-campaign";

const schema = z.object({
  subjectRo: z.string().trim().min(3, "Scrie subiectul.").max(200),
  subjectEn: z.string().trim().min(3, "Scrie subiectul în engleză.").max(200),
  bodyRo: z.string().trim().min(20, "Scrie mesajul (cel puțin 20 de litere).").max(20_000),
  bodyEn: z.string().trim().min(20, "Scrie mesajul în engleză.").max(20_000),
});

/**
 * Pornește trimiterea unui newsletter.
 *
 * Nu trimite aici: ar însemna să ținem cererea deschisă cât pleacă sute de
 * mesaje. Se scrie campania, iar sweeperul o duce la capăt în reprize, cu
 * progresul vizibil în pagină.
 */
export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    const body = schema.safeParse(await req.json());
    if (!body.success) return jsonValidationError(body.error);

    // o singură campanie odată: altfel două trimiteri s-ar încurca una pe alta
    const inCurs = await prisma.newsletterCampaign.findFirst({ where: { status: "SENDING" } });
    if (inCurs) return jsonError("TRIMITERE_IN_CURS", 409);

    const cati = await countSubscribers();
    if (cati === 0) return jsonError("FARA_ABONATI", 409);

    const campanie = await createCampaign({ ...body.data, createdById: admin.id });
    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: "NEWSLETTER_SENT",
        entity: "NewsletterCampaign",
        entityId: campanie.id,
        dataJson: JSON.stringify({ subiect: body.data.subjectRo, abonati: cati }),
      },
    });
    return jsonOk({ id: campanie.id, total: cati });
  } catch (e) {
    return handleApiError(e);
  }
}
