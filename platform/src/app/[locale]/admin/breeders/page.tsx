import { setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import RecordEditor, { type FieldDef } from "@/components/admin/RecordEditor";
import RowActions from "@/components/admin/RowActions";
import BreederAccountForm from "@/components/admin/BreederAccountForm";

export const dynamic = "force-dynamic";

const FIELDS: FieldDef[] = [
  {
    key: "name",
    label: "Nume",
    type: "text",
    required: true,
    hint: "Crescătorul sau crescătoria, cum apare pe site. Ex.: Burca Ionuț",
  },
  { key: "city", label: "Localitate", type: "text" },
  { key: "country", label: "Țara", type: "text", hint: "Ex.: România" },
  {
    key: "photoUrl",
    label: "Fotografie",
    type: "image",
    full: true,
    hint: "Crescătorul, crescătoria sau un porumbel reprezentativ. Apare pe pagina licitației.",
  },
  {
    key: "storyRo",
    label: "Povestea (RO)",
    type: "textarea",
    rows: 6,
    hint: "De când crește porumbei, liniile, ce îl face special. Un rând gol între paragrafe.",
  },
  { key: "storyEn", label: "Povestea (EN)", type: "textarea", rows: 4 },
  {
    key: "resultsRo",
    label: "Rezultate (RO)",
    type: "textarea",
    rows: 6,
    hint: "Cele mai importante rezultate, câte unul pe rând.",
  },
  { key: "resultsEn", label: "Rezultate (EN)", type: "textarea", rows: 4 },
];

export default async function AdminBreedersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ id?: string; new?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;

  const breeders = await prisma.breeder.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { sales: true } },
      user: { select: { email: true } },
    },
  });
  const editing = sp.new ? null : breeders.find((b) => b.id === sp.id);

  const initial = editing
    ? {
        id: editing.id,
        name: editing.name,
        city: editing.city ?? "",
        country: editing.country ?? "",
        photoUrl: editing.photoUrl ?? "",
        storyRo: editing.storyRo ?? "",
        storyEn: editing.storyEn ?? "",
        resultsRo: editing.resultsRo ?? "",
        resultsEn: editing.resultsEn ?? "",
      }
    : {
        name: "",
        city: "",
        country: "România",
        photoUrl: "",
        storyRo: "",
        storyEn: "",
        resultsRo: "",
        resultsEn: "",
      };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold">Crescători</h1>
        <a
          href="?new=1"
          data-testid="breeder-new"
          className="rounded-xl bg-ink px-5 py-2 text-sm font-bold text-ivory hover:bg-wing-orange"
        >
          + Crescător nou
        </a>
      </div>
      <p className="mb-6 max-w-3xl text-sm text-ink/60">
        Profilurile celor care vând. Fișa o completezi tu, apoi le faci licitația din{" "}
        <em>Licitații pe loturi</em>. Cu <strong>„Fă-i cont"</strong> crescătorul primește pe
        e-mail un link prin care își pune parola: după aceea își vede singur licitațiile,
        vânzările și decontul, și își poate ține la zi fișa.
      </p>

      {breeders.length > 0 && (
        <div className="mb-8 overflow-x-auto rounded-2xl border border-ink/10 bg-white">
          <table className="w-full min-w-[32rem] text-sm" data-testid="admin-breeders-table">
            <tbody>
              {breeders.map((b) => (
                <tr key={b.id} className="border-b border-ink/5 last:border-0">
                  <td className="px-4 py-2.5 font-semibold">{b.name}</td>
                  <td className="px-4 py-2.5 text-ink/60">
                    {[b.city, b.country].filter(Boolean).join(", ")}
                  </td>
                  <td className="px-4 py-2.5 text-ink/60">
                    {b._count.sales === 1 ? "1 licitație" : `${b._count.sales} licitații`}
                  </td>
                  <td className="px-4 py-2.5">
                    <BreederAccountForm breederId={b.id} email={b.user?.email ?? null} />
                  </td>
                  <td className="px-4 py-2.5 text-end">
                    <a
                      href={`?id=${b.id}`}
                      className="-my-1 inline-block rounded-lg px-3 py-2 font-semibold text-wing-blue hover:bg-wing-blue/10 hover:underline"
                      data-testid="breeder-edit"
                    >
                      Editează
                    </a>
                    <RowActions
                      testid="breeder-row"
                      toggle={{
                        url: `/api/admin/breeders/${b.id}/hide`,
                        field: "hidden",
                        on: b.hiddenAt !== null,
                        onLabel: "Arată pe site",
                        offLabel: "Ascunde de pe site",
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <RecordEditor
        key={editing?.id ?? "new"}
        endpoint="/api/admin/breeders"
        title={editing ? `Editează: ${editing.name}` : "Crescător nou"}
        initial={initial}
        fields={FIELDS}
      />
    </div>
  );
}
