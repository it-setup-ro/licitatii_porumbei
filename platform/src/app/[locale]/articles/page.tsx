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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">{t("title")}</h1>
          <p className="mt-2 text-ink/70">{t("subtitle")}</p>
        </div>
        {/* Clientul voia articole scrise de crescători, nu doar de admin. */}
        <Link
          href="/articles/propose"
          className="rounded-xl border border-ink/20 px-4 py-2 text-sm font-semibold hover:border-wing-blue"
          data-testid="articles-propose-link"
        >
          {t("propose")}
        </Link>
      </div>

      {articles.length === 0 ? (
        <p className="mt-10 text-ink/50" data-testid="articles-empty">
          {t("empty")}
        </p>
      ) : (
        /* Clientul: „aș vrea să fie în pătrățele, nu listă" — carduri mici,
           patru pe rând pe calculator, două pe telefon. */
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {articles.map((a) => {
            const title = pick(currentLocale, a.titleRo, a.titleEn);
            const excerpt = pick(currentLocale, a.excerptRo, a.excerptEn);
            return (
              <Link
                key={a.id}
                href={`/articles/${a.slug}`}
                data-testid="article-card"
                className="card-hover flex flex-col overflow-hidden rounded-2xl border border-ink/10 bg-white"
              >
                <div className="aspect-square bg-ivory-soft">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={a.coverUrl ?? "/pigeons/p1.svg"}
                    alt={title}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex flex-1 flex-col gap-1 p-3 sm:p-4">
                  <p className="text-[11px] uppercase tracking-wide text-ink/50">
                    {a.publishedAt ? t("published", { date: fmtDate(a.publishedAt) }) : ""}
                  </p>
                  <h2 className="font-display line-clamp-2 text-sm font-bold leading-snug sm:text-base">
                    {title}
                  </h2>
                  {excerpt && (
                    <p className="line-clamp-2 hidden text-xs text-ink/70 sm:block">{excerpt}</p>
                  )}
                  <span className="mt-auto pt-2 text-xs font-semibold text-wing-blue sm:text-sm">
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
