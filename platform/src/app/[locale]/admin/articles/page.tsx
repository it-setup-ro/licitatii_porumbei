import { setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import ArticleComposer from "@/components/admin/ArticleComposer";
import RowActions from "@/components/admin/RowActions";
import ProposalActions from "@/components/admin/ProposalActions";

export const dynamic = "force-dynamic";

export default async function AdminArticlesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ id?: string; new?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const breeders = await prisma.breeder.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });

  const articles = await prisma.article.findMany({
    orderBy: { updatedAt: "desc" },
    include: { media: { orderBy: { sortIdx: "asc" } }, _count: { select: { media: true } } },
  });
  const propuneri = await prisma.article.findMany({
    where: { proposedAt: { not: null }, publishedAt: null },
    orderBy: { proposedAt: "desc" },
    include: { proposedBy: { select: { name: true, email: true, sellerCompany: true } } },
  });
  const editing = sp.new ? null : articles.find((a) => a.id === sp.id);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold">
          {editing ? "Editează articolul" : "Scrie un articol"}
        </h1>
        {editing && (
          <a
            href="?new=1"
            data-testid="article-new"
            className="rounded-xl bg-ink px-5 py-2.5 text-sm font-bold text-ivory hover:bg-wing-orange"
          >
            + Articol nou
          </a>
        )}
      </div>

      <ArticleComposer
        key={editing?.id ?? "new"}
        articleId={editing?.id}
        initialTitle={editing?.titleRo ?? ""}
        initialBody={editing?.bodyRo ?? ""}
        // aratam campurile EN doar daca sunt o traducere reala, nu copia automata
        initialTitleEn={editing && editing.titleEn !== editing.titleRo ? editing.titleEn : ""}
        initialBodyEn={editing && editing.bodyEn !== editing.bodyRo ? editing.bodyEn : ""}
        initialMedia={
          editing?.media.map((m) => ({ url: m.url, type: m.type as "IMAGE" | "VIDEO" })) ?? []
        }
        initialPublished={editing ? editing.publishedAt !== null : true}
        initialBreederId={editing?.breederId ?? ""}
        breeders={breeders}
      />

      {propuneri.length > 0 && (
        <section className="mt-10" data-testid="admin-proposals">
          <h2 className="font-display mb-1 text-xl font-bold">
            Propuneri de la crescători ({propuneri.length})
          </h2>
          <p className="mb-3 text-sm text-ink/60">
            Le-a scris altcineva. Deschide-le, corectează ce trebuie (titlu, traducere, crescător),
            apoi publică — sau respinge cu un motiv, care ajunge la autor.
          </p>
          <div className="space-y-2">
            {propuneri.map((a) => (
              <div
                key={a.id}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-wing-orange/30 bg-wing-orange/5 p-3"
                data-testid="admin-proposal-row"
              >
                <a href={`?id=${a.id}`} className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{a.titleRo}</span>
                  <span className="text-xs text-ink/50">
                    {a.proposedBy?.sellerCompany || a.proposedBy?.name || a.proposedBy?.email} ·{" "}
                    {a.proposedAt
                      ? new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium" }).format(a.proposedAt)
                      : ""}
                  </span>
                </a>
                <ProposalActions articleId={a.id} />
              </div>
            ))}
          </div>
        </section>
      )}

      <h2 className="font-display mb-3 mt-10 text-xl font-bold">Articolele tale</h2>
      {articles.length === 0 ? (
        <p className="text-ink/50">Niciun articol încă.</p>
      ) : (
        <div className="space-y-2" data-testid="admin-articles-list">
          {articles.map((a) => (
            <div key={a.id} className="flex items-center gap-2">
            <a
              href={`?id=${a.id}`}
              data-testid="article-edit"
              className={`flex min-w-0 flex-1 items-center gap-3 rounded-2xl border bg-white p-3 transition-colors hover:border-wing-blue ${
                editing?.id === a.id ? "border-wing-blue" : "border-ink/10"
              }`}
            >
              {a.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.coverUrl} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
              ) : (
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-ink/5 text-ink/30">
                  ✎
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{a.titleRo}</span>
                <span className="text-xs text-ink/50">
                  {a.publishedAt
                    ? new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium" }).format(a.publishedAt)
                    : "ciornă"}
                  {a._count.media > 0 && ` · ${a._count.media} fișiere`}
                </span>
              </span>
              <span className="shrink-0 rounded-lg px-3 py-2 text-sm font-semibold text-wing-blue">
                Editează
              </span>
            </a>
              <RowActions
                testid="article-row"
                remove={{
                  url: `/api/admin/articles/${a.id}`,
                  confirm: `Ștergi articolul „${a.titleRo}"? Nu se poate da înapoi.`,
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
