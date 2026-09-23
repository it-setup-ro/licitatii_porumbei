import { setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import RecordEditor from "@/components/admin/RecordEditor";
import { FAQ_CATEGORIES, FAQ_CATEGORY_LABELS_RO, type FaqCategory } from "@/lib/faq";

export const dynamic = "force-dynamic";

/**
 * Întrebările de la Ajutor. Le scrie clientul, fără programator: aceeași
 * formă ca la pagini și produse, ca să nu învețe încă un ecran.
 */
export default async function AdminFaqPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ id?: string; new?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdmin();
  const sp = await searchParams;

  const items = await prisma.faqItem.findMany({
    orderBy: [{ category: "asc" }, { sortIdx: "asc" }],
  });
  const editing = sp.new ? null : items.find((i) => i.id === sp.id);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold">
          {editing ? "Editează întrebarea" : "Întrebare nouă la Ajutor"}
        </h1>
        {editing && (
          <a
            href="?new=1"
            data-testid="faq-new"
            className="rounded-xl bg-ink px-5 py-2.5 text-sm font-bold text-ivory hover:bg-wing-orange"
          >
            + Întrebare nouă
          </a>
        )}
      </div>

      <RecordEditor
        key={editing?.id ?? "new"}
        endpoint="/api/admin/faq"
        title={editing ? editing.questionRo : "Întrebare nouă"}
        initial={{
          ...(editing ? { id: editing.id } : {}),
          category: editing?.category ?? "OTHER",
          questionRo: editing?.questionRo ?? "",
          questionEn: editing?.questionEn ?? "",
          answerRo: editing?.answerRo ?? "",
          answerEn: editing?.answerEn ?? "",
          sortIdx: editing?.sortIdx ?? 0,
          published: editing ? editing.published : true,
        }}
        fields={[
          {
            key: "category",
            label: "Grupa",
            type: "select",
            options: FAQ_CATEGORIES.map((c) => ({ value: c, label: FAQ_CATEGORY_LABELS_RO[c] })),
          },
          { key: "sortIdx", label: "Ordinea în grupă", type: "number", hint: "0 = prima" },
          { key: "questionRo", label: "Întrebarea (RO)", type: "text", required: true, full: true },
          { key: "questionEn", label: "Întrebarea (EN)", type: "text", required: true, full: true },
          { key: "answerRo", label: "Răspunsul (RO)", type: "textarea", rows: 6, required: true, full: true },
          { key: "answerEn", label: "Răspunsul (EN)", type: "textarea", rows: 6, required: true, full: true },
          { key: "published", label: "Se vede pe site", type: "boolean" },
        ]}
        deletable={editing !== undefined && editing !== null}
      />

      <h2 className="font-display mb-3 mt-10 text-xl font-bold">Întrebările de acum</h2>
      {items.length === 0 ? (
        <p className="text-ink/60" data-testid="faq-empty">
          Nicio întrebare încă. Pagina de Ajutor arată doar legăturile generale.
        </p>
      ) : (
        <div className="space-y-6">
          {FAQ_CATEGORIES.filter((c) => items.some((i) => i.category === c)).map((c) => (
            <div key={c}>
              <h3 className="text-xs font-bold uppercase tracking-wide text-ink/50">
                {FAQ_CATEGORY_LABELS_RO[c as FaqCategory]}
              </h3>
              <ul className="mt-2 divide-y divide-ink/5 rounded-2xl border border-ink/10 bg-white">
                {items
                  .filter((i) => i.category === c)
                  .map((i) => (
                    <li key={i.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <a
                        href={`?id=${i.id}`}
                        className="min-w-0 flex-1 truncate font-medium hover:text-wing-blue"
                        data-testid="faq-row"
                      >
                        {i.questionRo}
                      </a>
                      {!i.published && (
                        <span className="text-xs font-bold uppercase tracking-wide text-ink/40">
                          ascunsă
                        </span>
                      )}
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
