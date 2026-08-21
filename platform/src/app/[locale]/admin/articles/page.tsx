import { setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import RecordEditor, { type FieldDef } from "@/components/admin/RecordEditor";

export const dynamic = "force-dynamic";

const FIELDS: FieldDef[] = [
  { key: "slug", label: "Identificator URL (slug)", type: "text", hint: "litere mici, cifre, cratime" },
  { key: "coverUrl", label: "Imagine copertă", type: "text", hint: "ex. /pigeons/p1.svg" },
  { key: "titleRo", label: "Titlu (RO)", type: "text" },
  { key: "titleEn", label: "Titlu (EN)", type: "text" },
  { key: "excerptRo", label: "Rezumat (RO)", type: "textarea", rows: 2 },
  { key: "excerptEn", label: "Rezumat (EN)", type: "textarea", rows: 2 },
  { key: "bodyRo", label: "Conținut (RO)", type: "textarea", rows: 12 },
  { key: "bodyEn", label: "Conținut (EN)", type: "textarea", rows: 12 },
  { key: "published", label: "Publicat", type: "boolean" },
];

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

  const articles = await prisma.article.findMany({ orderBy: { updatedAt: "desc" } });
  const editing = sp.new ? null : articles.find((a) => a.id === sp.id);

  const initial = editing
    ? {
        id: editing.id,
        slug: editing.slug,
        coverUrl: editing.coverUrl ?? "",
        titleRo: editing.titleRo,
        titleEn: editing.titleEn,
        excerptRo: editing.excerptRo ?? "",
        excerptEn: editing.excerptEn ?? "",
        bodyRo: editing.bodyRo,
        bodyEn: editing.bodyEn,
        published: editing.publishedAt !== null,
      }
    : {
        slug: "",
        coverUrl: "",
        titleRo: "",
        titleEn: "",
        excerptRo: "",
        excerptEn: "",
        bodyRo: "",
        bodyEn: "",
        published: false,
      };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold">Articole</h1>
        <a
          href="?new=1"
          data-testid="article-new"
          className="rounded-xl bg-ink px-5 py-2 text-sm font-bold text-ivory hover:bg-wing-orange"
        >
          + Articol nou
        </a>
      </div>

      <div className="mb-8 overflow-x-auto rounded-2xl border border-ink/10 bg-white">
        <table className="w-full min-w-[36rem] text-sm" data-testid="admin-articles-table">
          <tbody>
            {articles.map((a) => (
              <tr key={a.id} className="border-b border-ink/5 last:border-0">
                <td className="px-4 py-2.5 font-semibold">{a.titleRo}</td>
                <td className="px-4 py-2.5">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-bold ${
                      a.publishedAt ? "bg-green-100 text-green-700" : "bg-ink/10 text-ink/60"
                    }`}
                  >
                    {a.publishedAt ? "publicat" : "ciornă"}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <a
                    href={`?id=${a.id}`}
                    className="-my-1 inline-block rounded-lg px-3 py-2 font-semibold text-wing-blue hover:bg-wing-blue/10 hover:underline"
                    data-testid="article-edit"
                  >
                    Editează
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <RecordEditor
        key={editing?.id ?? "new"}
        endpoint="/api/admin/articles"
        title={editing ? `Editează: ${editing.titleRo}` : "Articol nou"}
        initial={initial}
        fields={FIELDS}
      />
    </div>
  );
}
