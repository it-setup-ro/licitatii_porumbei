import { randomBytes } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword, requireAdmin } from "@/lib/auth";
import { newResetToken, resetLink } from "@/lib/password";
import { sendEmail } from "@/lib/mailer";
import { emailTranslator } from "@/lib/messages";
import { suggestNickname } from "@/lib/nickname";
import { normalizeLocale } from "@/lib/locales";
import { getSettings } from "@/lib/settings";
import { jsonOk, jsonError, handleApiError, jsonValidationError } from "@/lib/api";

/**
 * Contul de crescător, făcut de administrator din fișa crescătorului.
 *
 * Crescătorul nu se înscrie singur și nu-și alege parola de la început: primește
 * pe e-mail un link prin care își pune parola. Linkul e același mecanism ca la
 * „Am uitat parola", doar că ține o săptămână — omul poate să nu-și citească
 * e-mailul în aceeași zi.
 *
 * Dacă adresa are deja cont pe site (a licitat, de pildă), nu se face altul: se
 * leagă acela de fișă, ca să nu ajungă omul cu două conturi.
 */

/** O invitație ține o săptămână: crescătorul poate să nu intre pe e-mail azi. */
const INVITE_ZILE = 7;

const schema = z.object({
  email: z.string().trim().toLowerCase().email("Scrie o adresă de e-mail validă.").max(200),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;
    const body = schema.safeParse(await req.json());
    if (!body.success) return jsonValidationError(body.error);
    const { email } = body.data;

    const breeder = await prisma.breeder.findUnique({ where: { id } });
    if (!breeder) return jsonError("NOT_FOUND", 404);

    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // parola se pune de om, prin link; asta e doar un ghem de octeți, ca să nu
      // existe cont fără parolă în bază
      const passwordHash = await hashPassword(randomBytes(24).toString("hex"));
      user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          name: breeder.name,
          nickname: await aliasLiber(breeder.name),
          locale: "ro",
          accountStatus: "APPROVED",
          addressCity: breeder.city,
          addressCountry: breeder.country,
        },
      });
    }

    const alt = await prisma.breeder.findFirst({
      where: { userId: user.id, id: { not: breeder.id } },
    });
    if (alt) {
      return jsonError("VALIDATION", 422, {
        fields: { email: `Contul e deja legat de crescătorul „${alt.name}".` },
      });
    }

    await prisma.breeder.update({ where: { id: breeder.id }, data: { userId: user.id } });

    // un singur link valabil: cele vechi se închid
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    const { raw, hash } = newResetToken();
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hash,
        expiresAt: new Date(Date.now() + INVITE_ZILE * 24 * 60 * 60_000),
      },
    });

    const lang = normalizeLocale(user.locale);
    const t = emailTranslator(lang);
    // numele platformei vine din Setări, nu din traduceri
    const { siteName } = await getSettings();
    await sendEmail({
      to: user.email,
      subject: t("breederInvite.subject", { site: siteName }),
      text: t("breederInvite.body", {
        name: breeder.name,
        link: resetLink(raw, lang),
        days: INVITE_ZILE,
        site: siteName,
      }),
    });

    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: "BREEDER_ACCOUNT_INVITED",
        entity: "Breeder",
        entityId: breeder.id,
        dataJson: JSON.stringify({ email }),
      },
    });

    return jsonOk({ email: user.email });
  } catch (e) {
    return handleApiError(e);
  }
}

/** Dezlegarea contului: fișa rămâne, omul nu mai vede nimic. */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;
    const breeder = await prisma.breeder.findUnique({ where: { id } });
    if (!breeder) return jsonError("NOT_FOUND", 404);

    await prisma.breeder.update({ where: { id }, data: { userId: null } });
    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: "BREEDER_ACCOUNT_UNLINKED",
        entity: "Breeder",
        entityId: id,
      },
    });
    return jsonOk();
  } catch (e) {
    return handleApiError(e);
  }
}

/** Aliasul de pornire, cu o cifră la sfârșit dacă e luat („BurcaI2"). */
async function aliasLiber(name: string): Promise<string> {
  const baza = suggestNickname(name);
  for (let i = 0; i < 20; i++) {
    const candidat = i === 0 ? baza : `${baza}${i + 1}`;
    const luat = await prisma.user.findUnique({ where: { nickname: candidat } });
    if (!luat) return candidat;
  }
  return `${baza}${randomBytes(2).toString("hex")}`;
}
