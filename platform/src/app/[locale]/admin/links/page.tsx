import { setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import RecordEditor, { type FieldDef } from "@/components/admin/RecordEditor";

export const dynamic = "force-dynamic";

const FIELDS: FieldDef[] = [
  { key: "labelRo", label: "Denumire (RO)", type: "text" },
  { key: "labelEn", label: "Denumire (EN)", type: "text" },
  {
    key: "url",
    label: "Adresa site-ului",
    type: "text",
    full: true,
    hint: "trebuie să înceapă cu https:// — lasă gol ca să apară „în curând”",
  },
  { key: "sortIdx", label: "Ordine în meniu", type: "number" },
  { key: "active", label: "Vizibil în meniu", type: "boolean" },
];

export default async function AdminLinksPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ id?: string; new?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;

  const links = await prisma.externalLink.findMany({
    where: { group: "CONTESTS" },
    orderBy: { sortIdx: "asc" },
  });
  const editing = sp.new ? null : links.find((l) => l.id === sp.id);

  const initial = editing
    ? {
        id: editing.id,
        group: "CONTESTS",
        labelRo: editing.labelRo,
        labelEn: editing.labelEn,
        url: editing.url ?? "",
        sortIdx: editing.sortIdx,
        active: editing.active,
      }
    : {
        group: "CONTESTS",
        labelRo: "",
        labelEn: "",
        url: "",
        sortIdx: links.length + 1,
        active: true,
      };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold">Linkuri „Concursuri”</h1>
        <a
          href="?new=1"
          data-testid="link-new"
          className="rounded-xl bg-ink px-5 py-2 text-sm font-bold text-ivory hover:bg-wing-orange"
        >
          + Link nou
        </a>
      </div>
      <p className="mb-6 text-sm text-ink/60">
        Intrările din submeniul „Concursuri Campionat”. Se deschid în filă nouă. Când apar
        clasamentele pe anul următor, schimbi doar adresa aici.
      </p>

      <div className="mb-8 overflow-x-auto rounded-2xl border border-ink/10 bg-white">
        <table className="w-full min-w-[36rem] text-sm" data-testid="admin-links-table">
          <tbody>
            {links.map((l) => (
              <tr key={l.id} className="border-b border-ink/5 last:border-0">
                <td className="w-10 px-4 py-2.5 text-ink/40">{l.sortIdx}</td>
                <td className="px-4 py-2.5 font-semibold">{l.labelRo}</td>
                <td className="max-w-xs truncate px-4 py-2.5 text-ink/60">
                  {l.url ?? <span className="italic">fără adresă („în curând”)</span>}
                </td>
                <td className="px-4 py-2.5">
                  {!l.active && (
                    <span className="rounded bg-ink/10 px-2 py-0.5 text-xs font-bold">ascuns</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <a
                    href={`?id=${l.id}`}
                    className="-my-1 inline-block rounded-lg px-3 py-2 font-semibold text-wing-blue hover:bg-wing-blue/10 hover:underline"
                    data-testid="link-edit"
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
        endpoint="/api/admin/links"
        title={editing ? `Editează: ${editing.labelRo}` : "Link nou"}
        initial={initial}
        fields={FIELDS}
      />
    </div>
  );
}
