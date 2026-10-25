import { getTranslations, getLocale, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { Link } from "@/i18n/navigation";
import { intlLocale, pick } from "@/lib/locales";
import { platformFormat } from "@/lib/platform-time";

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
    platformFormat(intlLocale(currentLocale), {
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
        /* Clientul: „aș vrea să fie în pătrățele, nu listă"; apoi, văzând pagina:
           „prezentarea articolelor să aibă dimensiunea ecranului, când scrolezi și
           cuprinzi linia de articole să nu se vadă și alea de jos. Și eventual mai
           late, să se vadă bine." Deci două pe rând, late, cu poza mare, iar un
           rând cât ecranul: când te oprești pe el, nu mai vezi și rândul de jos.
           Prinderea la derulare (scroll-snap) am încercat-o și am scos-o: trăgea
           pagina înapoi exact când voiai să apeși ceva din bara de sus. */
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {articles.map((a) => {
            const title = pick(currentLocale, a.titleRo, a.titleEn);
            const excerpt = pick(currentLocale, a.excerptRo, a.excerptEn);
            return (
              <Link
                key={a.id}
                href={`/articles/${a.slug}`}
                data-testid="article-card"
                /* Pe calculator un rand umple ecranul: asa, cand te opresti pe el,
                   nu mai vezi si jumatati din randul de jos. */
                className="card-hover flex flex-col overflow-hidden rounded-2xl border border-ink/10 bg-white sm:min-h-[calc(100vh-7rem)]"
              >
                <div className="aspect-[16/10] bg-ivory-soft sm:aspect-auto sm:flex-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={a.coverUrl ?? "/pigeons/p1.svg"}
                    alt={title}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex flex-1 flex-col gap-2 p-4 sm:p-5">
                  <p className="text-[11px] uppercase tracking-wide text-ink/50">
                    {a.publishedAt ? t("published", { date: fmtDate(a.publishedAt) }) : ""}
                  </p>
                  <h2 className="font-display line-clamp-2 text-lg font-bold leading-snug sm:text-2xl">
                    {title}
                  </h2>
                  {excerpt && (
                    <p className="line-clamp-3 text-sm text-ink/70">{excerpt}</p>
                  )}
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
