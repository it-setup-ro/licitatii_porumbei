import { getTranslations, getLocale, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { Link } from "@/i18n/navigation";
import { intlLocale, pick } from "@/lib/locales";

export const dynamic = "force-dynamic";

export default async function ArticlesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("articles");
  const currentLocale = await getLocale();

  const articles = await prisma.article.findMany({
    where: { publishedAt: { not: null, lte: new Date() } },
    orderBy: { publishedAt: "desc" },
    take: 30,
  });

  const fmtDate = (d: Date) =>
    new Intl.DateTimeFormat(intlLocale(currentLocale), {
      dateStyle: "long",
    }).format(d);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="font-display text-3xl font-bold">{t("title")}</h1>
      <p className="mt-2 text-ink/70">{t("subtitle")}</p>

      {articles.length === 0 ? (
        <p className="mt-10 text-ink/50" data-testid="articles-empty">
          {t("empty")}
        </p>
      ) : (
        /* Clientul: casete mai mici, ca pe voiajor.net/articole — un rând pe
           articol, cu poza mică în stânga, ca să încapă mai multe pe ecran. */
        <div className="mt-8 space-y-4">
          {articles.map((a) => {
            const title = pick(currentLocale, a.titleRo, a.titleEn);
            const excerpt = pick(currentLocale, a.excerptRo, a.excerptEn);
            return (
              <Link
                key={a.id}
                href={`/articles/${a.slug}`}
                data-testid="article-card"
                className="card-hover flex gap-4 overflow-hidden rounded-2xl border border-ink/10 bg-white p-3 sm:gap-5 sm:p-4"
              >
                <div className="h-24 w-32 shrink-0 overflow-hidden rounded-xl bg-ivory-soft sm:h-28 sm:w-44">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={a.coverUrl ?? "/pigeons/p1.svg"}
                    alt={title}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p className="text-xs uppercase tracking-wide text-ink/50">
                    {a.publishedAt ? t("published", { date: fmtDate(a.publishedAt) }) : ""}
                  </p>
                  <h2 className="font-display text-base font-bold leading-snug sm:text-lg">
                    {title}
                  </h2>
                  {excerpt && (
                    <p className="line-clamp-2 text-sm text-ink/70 sm:line-clamp-3">{excerpt}</p>
                  )}
                  <span className="mt-auto pt-1 text-sm font-semibold text-wing-blue">
                    {t("readMore")} →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
