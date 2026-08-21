import { setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import RecordEditor, { type FieldDef } from "@/components/admin/RecordEditor";

export const dynamic = "force-dynamic";

/** input[type=datetime-local] cere formatul YYYY-MM-DDTHH:mm, fără fus orar. */
function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const FIELDS: FieldDef[] = [
  { key: "slug", label: "Identificator URL (slug)", type: "text" },
  {
    key: "status",
    label: "Stare",
    type: "select",
    options: [
      { value: "UPCOMING", label: "În curând" },
      { value: "ACTIVE", label: "În desfășurare" },
      { value: "FINISHED", label: "Încheiat" },
    ],
  },
  { key: "titleRo", label: "Titlu (RO)", type: "text" },
  { key: "titleEn", label: "Titlu (EN)", type: "text" },
  { key: "startsAt", label: "Începe la", type: "datetime" },
  { key: "endsAt", label: "Se încheie la", type: "datetime" },
  { key: "descRo", label: "Descriere (RO)", type: "textarea", rows: 4 },
  { key: "descEn", label: "Descriere (EN)", type: "textarea", rows: 4 },
  { key: "rulesRo", label: "Regulament (RO)", type: "textarea", rows: 8 },
  { key: "rulesEn", label: "Regulament (EN)", type: "textarea", rows: 8 },
  { key: "coverUrl", label: "Imagine copertă", type: "text" },
  { key: "published", label: "Publicat", type: "boolean" },
];

export default async function AdminContestsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ id?: string; new?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;

  const contests = await prisma.contest.findMany({
    include: { _count: { select: { auctions: true } } },
    orderBy: { startsAt: "desc" },
  });
  const editing = sp.new ? null : contests.find((c) => c.id === sp.id);

  const now = new Date();
  const initial = editing
    ? {
        id: editing.id,
        slug: editing.slug,
        status: editing.status,
        titleRo: editing.titleRo,
        titleEn: editing.titleEn,
        startsAt: toLocalInput(editing.startsAt),
        endsAt: toLocalInput(editing.endsAt),
        descRo: editing.descRo ?? "",
        descEn: editing.descEn ?? "",
        rulesRo: editing.rulesRo ?? "",
        rulesEn: editing.rulesEn ?? "",
        coverUrl: editing.coverUrl ?? "",
        published: editing.published,
      }
    : {
        slug: "",
        status: "UPCOMING",
        titleRo: "",
        titleEn: "",
        startsAt: toLocalInput(now),
        endsAt: toLocalInput(new Date(now.getTime() + 30 * 86_400_000)),
        descRo: "",
        descEn: "",
        rulesRo: "",
        rulesEn: "",
        coverUrl: "",
        published: false,
      };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold">Concursuri</h1>
        <a
          href="?new=1"
          data-testid="contest-new"
          className="rounded-xl bg-ink px-5 py-2 text-sm font-bold text-ivory hover:bg-wing-orange"
        >
          + Concurs nou
        </a>
      </div>

      <div className="mb-8 overflow-hidden rounded-2xl border border-ink/10 bg-white">
        <table className="w-full text-sm" data-testid="admin-contests-table">
          <tbody>
            {contests.map((c) => (
              <tr key={c.id} className="border-b border-ink/5 last:border-0">
                <td className="px-4 py-2.5 font-semibold">{c.titleRo}</td>
                <td className="px-4 py-2.5 text-ink/60">{c.status}</td>
                <td className="px-4 py-2.5 text-ink/60">{c._count.auctions} loturi</td>
                <td className="px-4 py-2.5">
                  {!c.published && (
                    <span className="rounded bg-ink/10 px-2 py-0.5 text-xs font-bold">ciornă</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <a
                    href={`?id=${c.id}`}
                    className="font-semibold text-wing-blue hover:underline"
                    data-testid="contest-edit"
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
        endpoint="/api/admin/contests"
        title={editing ? `Editează: ${editing.titleRo}` : "Concurs nou"}
        initial={initial}
        fields={FIELDS}
      />
    </div>
  );
}
