import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { Link } from "@/i18n/navigation";
import { pick } from "@/lib/locales";
import { FAQ_CATEGORIES } from "@/lib/faq";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

/**
 * Ajutor: întrebările care se pun cel mai des, grupate, plus unde se cere ajutor
 * de la om. Textele le scrie clientul din administrare; aici doar se arată.
 *
 * Deschiderea se face cu <details>, nu cu JavaScript: merge și pe telefon slab,
 * și la căutarea din pagină (Ctrl+F găsește și răspunsurile închise).
 */
export default async function HelpPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("help");
  const settings = await getSettings();

  const items = await prisma.faqItem.findMany({
    where: { published: true },
    orderBy: [{ sortIdx: "asc" }, { createdAt: "asc" }],
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-display text-3xl font-bold">{t("title")}</h1>
      <p className="mt-2 text-ink/70">{t("intro")}</p>

      {items.length === 0 ? (
        <p className="mt-8 text-ink/60" data-testid="help-empty">
          {t("empty")}
        </p>
      ) : (
        <div className="mt-8 space-y-8" data-testid="help-list">
          {FAQ_CATEGORIES.filter((c) => items.some((i) => i.category === c)).map((c) => (
            <section key={c} data-testid="help-group">
              <h2 className="font-display text-xl font-bold">{t(`groups.${c}`)}</h2>
              <div className="mt-3 divide-y divide-ink/5 overflow-hidden rounded-2xl border border-ink/10 bg-white">
                {items
                  .filter((i) => i.category === c)
                  .map((i) => (
                    <details key={i.id} className="group px-5 py-4" data-testid="help-item">
                      <summary className="cursor-pointer list-none font-semibold marker:content-none">
                        <span className="me-2 text-wing-blue transition-transform group-open:rotate-90 inline-block">
                          ›
                        </span>
                        {pick(locale, i.questionRo, i.questionEn)}
                      </summary>
                      <p className="mt-2 whitespace-pre-line text-ink/80">
                        {pick(locale, i.answerRo, i.answerEn)}
                      </p>
                    </details>
                  ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Ajutorul scris nu acoperă tot: omul trebuie să aibă unde întreba. */}
      <div className="mt-10 rounded-2xl border border-ink/10 bg-white p-6" data-testid="help-contact">
        <h2 className="font-display text-xl font-bold">{t("stillStuck")}</h2>
        <p className="mt-2 text-ink/70">{t("stillStuckText")}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/contact"
            className="rounded-xl bg-ink px-5 py-2.5 text-sm font-bold text-ivory hover:bg-wing-orange"
            data-testid="help-contact-link"
          >
            {t("writeUs")}
          </Link>
          <Link
            href="/how-it-works"
            className="rounded-xl border border-ink/20 px-5 py-2.5 text-sm font-semibold hover:border-wing-blue"
          >
            {t("howItWorks")}
          </Link>
        </div>
        {(settings.contactPhone || settings.contactSchedule) && (
          <p className="mt-4 text-sm text-ink/60">
            {settings.contactPhone && <span className="me-3">{settings.contactPhone}</span>}
            {settings.contactSchedule}
          </p>
        )}
      </div>
    </div>
  );
}
