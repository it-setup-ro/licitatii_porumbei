import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { Link } from "@/i18n/navigation";
import { intlLocale } from "@/lib/locales";
import ProposeArticleForm from "@/components/ProposeArticleForm";

export const dynamic = "force-dynamic";

/**
 * „Propune un articol" — pentru crescătorii aprobați.
 *
 * Clientul voia articole scrise de crescători, dar până acum putea scrie doar
 * administratorul. Aici omul își trimite povestea; ea nu apare pe site până
 * când adminul nu o citește.
 */
export default async function ProposeArticlePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("propose");
  const user = await getCurrentUser();

  const poate = user && (user.role === "ADMIN" || user.sellerStatus === "APPROVED");

  const aleMele = user
    ? await prisma.article.findMany({
        where: { proposedById: user.id },
        orderBy: { proposedAt: "desc" },
        take: 10,
        select: { id: true, slug: true, titleRo: true, publishedAt: true, proposedAt: true, reviewNote: true },
      })
    : [];

  const dataFmt = new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: "medium" });

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-display text-3xl font-bold">{t("title")}</h1>
      <p className="mt-2 text-ink/70">{t("intro")}</p>

      {!user ? (
        <div className="mt-8 rounded-2xl border border-ink/10 bg-white p-6" data-testid="propose-login">
          <p className="text-ink/70">{t("loginNeeded")}</p>
          <Link
            href="/login"
            className="mt-4 inline-block rounded-xl bg-ink px-5 py-2.5 text-sm font-bold text-ivory hover:bg-wing-orange"
          >
            {t("login")}
          </Link>
        </div>
      ) : !poate ? (
        <div className="mt-8 rounded-2xl border border-ink/10 bg-white p-6" data-testid="propose-not-allowed">
          <p className="text-ink/70">{t("sellersOnly")}</p>
          <Link
            href="/contact"
            className="mt-4 inline-block rounded-xl border border-ink/20 px-5 py-2.5 text-sm font-semibold hover:border-wing-blue"
          >
            {t("writeUs")}
          </Link>
        </div>
      ) : (
        <div className="mt-8">
          <ProposeArticleForm />
        </div>
      )}

      {aleMele.length > 0 && (
        <section className="mt-12" data-testid="propose-mine">
          <h2 className="font-display text-xl font-bold">{t("mine")}</h2>
          <ul className="mt-3 divide-y divide-ink/5 rounded-2xl border border-ink/10 bg-white">
            {aleMele.map((a) => (
              <li key={a.id} className="px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">{a.titleRo}</span>
                  <span className="text-xs font-bold uppercase tracking-wide text-ink/50">
                    {a.publishedAt ? t("statusPublished") : t("statusWaiting")}
                  </span>
                </div>
                <p className="text-sm text-ink/50">
                  {a.proposedAt ? dataFmt.format(a.proposedAt) : ""}
                </p>
                {a.reviewNote && (
                  <p className="mt-1 text-sm text-ink/70" data-testid="propose-note">
                    {t("adminNote")}: {a.reviewNote}
                  </p>
                )}
                {a.publishedAt && (
                  <Link href={`/articles/${a.slug}`} className="text-sm font-semibold text-wing-blue">
                    {t("seeIt")}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
