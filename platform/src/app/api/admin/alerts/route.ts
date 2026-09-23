import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError, jsonValidationError } from "@/lib/api";
import { ALERT_EVENT_KEYS, newInviteCode } from "@/lib/alerts";
import { telegramBotName, telegramConfigured } from "@/lib/telegram";

const schema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("EMAIL"),
    label: z.string().trim().min(2, "Scrie un nume, ca să știi cine e.").max(80),
    email: z.string().trim().email("Adresa nu pare bună.").max(200),
  }),
  z.object({
    kind: z.literal("TELEGRAM"),
    label: z.string().trim().min(2, "Scrie un nume, ca să știi cine e.").max(80),
  }),
]);

/**
 * Adaugă pe cineva la anunțuri. La e-mail e gata pe loc; la Telegram iese un
 * cod și un link pe care omul îl apasă de pe telefonul lui — așa adminul își
 * face singur legătura, fără să umble nimeni pe server.
 */
export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = schema.safeParse(await req.json());
    if (!body.success) return jsonValidationError(body.error);
    const d = body.data;

    if (d.kind === "EMAIL") {
      const creat = await prisma.alertRecipient.create({
        data: {
          kind: "EMAIL",
          label: d.label,
          email: d.email,
          events: JSON.stringify(ALERT_EVENT_KEYS),
        },
      });
      return jsonOk({ id: creat.id });
    }

    if (!telegramConfigured()) return jsonError("TELEGRAM_NECONFIGURAT", 409);

    const cod = newInviteCode();
    const creat = await prisma.alertRecipient.create({
      data: {
        kind: "TELEGRAM",
        label: d.label,
        code: cod,
        codeAt: new Date(),
        events: JSON.stringify(ALERT_EVENT_KEYS),
      },
    });

    let link: string | null = null;
    try {
      link = `https://t.me/${await telegramBotName()}?start=${cod}`;
    } catch (e) {
      // botul nu răspunde: codul rămâne bun, se poate scrie de mână în chat
      console.error("[anunțuri] numele botului:", e);
    }
    return jsonOk({ id: creat.id, code: cod, link });
  } catch (e) {
    return handleApiError(e);
  }
}
