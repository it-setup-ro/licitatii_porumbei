import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError, jsonValidationError } from "@/lib/api";
import { deleteSmtpConfig, saveSmtpConfig, SMTP_PRESETS } from "@/lib/smtp-config";

/**
 * Datele serviciului de e-mail, scrise din administrare.
 *
 * Parola nu se întoarce niciodată către pagină: la editare, câmpul rămâne gol
 * și, dacă omul nu scrie nimic, se păstrează cea veche.
 */
const schema = z.object({
  provider: z.enum(Object.keys(SMTP_PRESETS) as [string, ...string[]]),
  host: z.string().trim().min(3, "Scrie adresa serverului de e-mail.").max(200),
  port: z.number().int().min(1).max(65535),
  user: z.string().trim().min(3, "Scrie utilizatorul (de obicei adresa de e-mail).").max(200),
  pass: z.string().max(400).optional(),
  fromEmail: z.string().trim().email("Adresa de expediere nu pare bună.").max(200),
  fromName: z.string().trim().min(2, "Scrie numele care apare la expeditor.").max(120),
});

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = schema.safeParse(await req.json());
    if (!body.success) return jsonValidationError(body.error);

    const rezultat = await saveSmtpConfig({
      ...body.data,
      provider: body.data.provider as keyof typeof SMTP_PRESETS,
      pass: body.data.pass?.trim() || undefined,
    });
    if (!rezultat.ok) {
      return jsonError("VALIDATION", 422, {
        fields: { pass: "Scrie parola (sau cheia) — fără ea nu putem trimite." },
      });
    }
    return jsonOk();
  } catch (e) {
    return handleApiError(e);
  }
}

/** Scoate datele scrise din site (rămâne doar ce e pe server, dacă e ceva). */
export async function DELETE() {
  try {
    await requireAdmin();
    await deleteSmtpConfig();
    return jsonOk();
  } catch (e) {
    return handleApiError(e);
  }
}
