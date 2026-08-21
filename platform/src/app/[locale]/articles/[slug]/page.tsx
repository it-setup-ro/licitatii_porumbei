import { notFound } from "next/navigation";
import { getTranslations, getLocale, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { Link } from "@/i18n/navigation";
import RichText from "@/components/RichText";

export const dynamic = "force-dynamic";

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("articles");
  const currentLocale = await getLocale();

  const article = await prisma.article.findFirst({
    where: { slug, publishedAt: { not: null, lte: new Date() } },
  });
  if (!article) notFound();

  const title = currentLocale === "en" ? article.titleEn : article.titleRo;
  const body = currentLocale === "en" ? article.bodyEn : article.bodyRo;

  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/articles" className="text-sm text-ink/60 hover:text-wing-orange">
        {t("backToList")}
      </Link>

      {article.coverUrl && (
        <div className="mt-4 overflow-hidden rounded-2xl border border-ink/10 bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={article.coverUrl} alt={title} className="aspect-[16/9] w-full object-cover" />
        </div>
      )}

      <h1 className="font-display mt-6 text-3xl font-bold" data-testid="article-title">
        {title}
      </h1>
      <p className="mt-2 text-sm text-ink/50">
        {article.publishedAt
          ? t("published", {
              date: new Intl.DateTimeFormat(currentLocale === "ro" ? "ro-RO" : "en-GB", {
                dateStyle: "long",
              }).format(article.publishedAt),
            })
          : ""}
        {" · "}
        {article.authorName}
      </p>

      <div className="mt-6" data-testid="article-body">
        <RichText text={body} />
      </div>
    </article>
  );
}
