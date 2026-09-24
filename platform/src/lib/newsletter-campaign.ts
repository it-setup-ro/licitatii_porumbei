import { prisma } from "./db";
import { sendEmail } from "./mailer";
import { pick } from "./locales";
import { siteUrl } from "./alerts";

/**
 * Trimiterea unui newsletter către abonați.
 *
 * Lipsea cu totul: abonații se vedeau și se exportau, dar nu se putea trimite
 * nimic din site. Se trimite în reprize, din sweeper (câte un pumn la fiecare
 * rundă de 15 secunde), din trei motive:
 *  - 300 de e-mailuri într-o singură cerere ar depăși orice termen de așteptare;
 *  - furnizorii de e-mail refuză rafalele mari;
 *  - dacă serverul repornește la mijloc, se continuă de unde a rămas, fără să
 *    primească nimeni același mesaj de două ori (ținem minte până unde s-a ajuns).
 */

/** Câți într-o rundă. La 15 secunde pe rundă înseamnă ~80 pe minut. */
const PE_RUNDA = 20;

export type CampanieNoua = {
  subjectRo: string;
  subjectEn: string;
  bodyRo: string;
  bodyEn: string;
  createdById: string;
};

export async function countSubscribers(): Promise<number> {
  return prisma.newsletterSubscriber.count({ where: { unsubscribedAt: null } });
}

export async function createCampaign(d: CampanieNoua) {
  const total = await countSubscribers();
  return prisma.newsletterCampaign.create({
    data: { ...d, total, status: "SENDING", startedAt: new Date() },
  });
}

/** Textul unui mesaj, în limba abonatului, cu linkul de dezabonare la final. */
export function composeEmail(
  campanie: { subjectRo: string; subjectEn: string; bodyRo: string; bodyEn: string },
  abonat: { locale: string; unsubToken: string },
  baza: string | null
): { subject: string; text: string } {
  const subject = pick(abonat.locale, campanie.subjectRo, campanie.subjectEn);
  const corp = pick(abonat.locale, campanie.bodyRo, campanie.bodyEn);
  const cale = `/${abonat.locale === "ro" ? "ro" : "en"}/newsletter/unsubscribe?token=${abonat.unsubToken}`;
  const dezabonare =
    abonat.locale === "ro"
      ? `Nu mai vrei aceste mesaje? Te dezabonezi de aici: ${baza ? baza + cale : cale}`
      : `Don't want these e-mails? Unsubscribe here: ${baza ? baza + cale : cale}`;
  return { subject, text: `${corp}\n\n—\n${dezabonare}` };
}

/**
 * O rundă de trimitere. Nu aruncă niciodată: o pană la e-mail nu are voie să
 * oprească sweeperul (care închide și licitații).
 */
export async function sendNewsletterBatch(): Promise<{ trimise: number }> {
  let trimise = 0;
  try {
    const campanie = await prisma.newsletterCampaign.findFirst({
      where: { status: "SENDING" },
      orderBy: { createdAt: "asc" },
    });
    if (!campanie) return { trimise: 0 };

    const abonati = await prisma.newsletterSubscriber.findMany({
      where: {
        unsubscribedAt: null,
        ...(campanie.cursor ? { id: { gt: campanie.cursor } } : {}),
      },
      orderBy: { id: "asc" },
      take: PE_RUNDA,
    });

    if (abonati.length === 0) {
      await prisma.newsletterCampaign.update({
        where: { id: campanie.id },
        data: { status: "SENT", finishedAt: new Date() },
      });
      return { trimise: 0 };
    }

    const baza = siteUrl();
    let esuate = 0;
    for (const a of abonati) {
      const { subject, text } = composeEmail(campanie, a, baza);
      try {
        const { sent } = await sendEmail({ to: a.email, subject, text });
        if (sent) trimise++;
        else esuate++;
      } catch {
        esuate++;
      }
    }

    await prisma.newsletterCampaign.update({
      where: { id: campanie.id },
      data: {
        cursor: abonati[abonati.length - 1].id,
        sent: { increment: trimise },
        failed: { increment: esuate },
      },
    });
  } catch (e) {
    console.error("[newsletter]", e);
  }
  return { trimise };
}
