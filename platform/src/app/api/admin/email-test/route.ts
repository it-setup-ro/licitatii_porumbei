import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError, jsonValidationError } from "@/lib/api";
import { sendEmail } from "@/lib/mailer";
import { smtpStatusFull } from "@/lib/smtp-status";

const schema = z.object({
  to: z.string().trim().email("Scrie o adresă de e-mail validă.").max(200),
});

/**
 * „Trimite un e-mail de probă" — singurul mod cinstit de a ști că merge.
 * Spune pe loc dacă a plecat sau ce a răspuns serverul de e-mail.
 */
export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = schema.safeParse(await req.json());
    if (!body.success) return jsonValidationError(body.error);

    const stare = await smtpStatusFull();
    if (!stare.configurat) return jsonError("SMTP_NECONFIGURAT", 409);

    const { sent } = await sendEmail({
      to: body.data.to,
      subject: "Probă — No.1 & Best Pigeons",
      text: [
        "Acesta e un e-mail de probă trimis din administrare.",
        "",
        `Server: ${stare.host}${stare.port ? ":" + stare.port : ""}`,
        `Expeditor: ${stare.expeditor ?? "(nesetat)"}`,
        "",
        "Dacă l-ai primit, platforma poate trimite e-mailuri.",
      ].join("\n"),
    });

    if (!sent) return jsonError("TRIMITERE_ESUATA", 502);
    return jsonOk();
  } catch (e) {
    return handleApiError(e);
  }
}
