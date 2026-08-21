import { getTranslations, getLocale, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { Link } from "@/i18n/navigation";

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
    new Intl.DateTimeFormat(currentLocale === "ro" ? "ro-RO" : "en-GB", {
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
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {articles.map((a) => {
            const title = currentLocale === "en" ? a.titleEn : a.titleRo;
            const excerpt = currentLocale === "en" ? a.excerptEn : a.excerptRo;
            return (
              <Link
                key={a.id}
                href={`/articles/${a.slug}`}
                data-testid="article-card"
                className="card-hover flex flex-col overflow-hidden rounded-2xl border border-ink/10 bg-white"
              >
                <div className="aspect-[16/9] bg-ivory-soft">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={a.coverUrl ?? "/pigeons/p1.svg"}
                    alt={title}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex flex-1 flex-col gap-2 p-5">
                  <p className="text-xs uppercase tracking-wide text-ink/50">
                    {a.publishedAt ? t("published", { date: fmtDate(a.publishedAt) }) : ""}
                  </p>
                  <h2 className="font-display text-xl font-bold leading-snug">{title}</h2>
                  {excerpt && <p className="text-sm text-ink/70">{excerpt}</p>}
                  <span className="mt-auto pt-2 text-sm font-semibold text-wing-blue">
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
