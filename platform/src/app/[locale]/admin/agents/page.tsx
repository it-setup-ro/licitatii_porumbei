import { setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import RecordEditor, { type FieldDef } from "@/components/admin/RecordEditor";

export const dynamic = "force-dynamic";

const KIND_LABEL: Record<string, string> = { TRANSPORT: "Transportator", AGENT: "Agent" };

const FIELDS: FieldDef[] = [
  {
    key: "kind",
    label: "Tip",
    type: "select",
    required: true,
    hint: "Pe pagină, transportatorii și agenții apar în două grupuri separate.",
    options: [
      { value: "TRANSPORT", label: "Transportator" },
      { value: "AGENT", label: "Agent" },
    ],
  },
  {
    key: "name",
    label: "Nume",
    type: "text",
    required: true,
    hint: "Numele firmei sau al persoanei. Ex.: Luca Pigeons Transport",
  },
  {
    key: "zone",
    label: "Zonă / trasee",
    type: "text",
    full: true,
    hint: "Ex.: Arad, Timiș, Bihor — sau: România ↔ Germania, Italia, Spania, Portugalia",
  },
  {
    key: "phone",
    label: "Telefon",
    type: "text",
    hint: "Ex.: 0723 137 787. Pe telefon devine buton de apel.",
  },
  {
    key: "whatsapp",
    label: "WhatsApp",
    type: "text",
    hint: "Numărul de WhatsApp, chiar dacă e același cu telefonul. Apare un buton verde.",
  },
  { key: "email", label: "E-mail", type: "text" },
  {
    key: "website",
    label: "Site sau pagină de Facebook",
    type: "text",
    hint: "Adresa completă, cu https://",
  },
  {
    key: "logoUrl",
    label: "Logo sau fotografie",
    type: "image",
    full: true,
    hint: "Opțional. Fără poză, cardul arată inițiala numelui.",
  },
  {
    key: "descRo",
    label: "Prezentare (RO)",
    type: "textarea",
    rows: 10,
    hint: "Serviciile, destinațiile, experiența. Un rând gol între paragrafe.",
  },
  {
    key: "descEn",
    label: "Prezentare (EN)",
    type: "textarea",
    rows: 6,
    hint: "Opțional. Fără ea, în engleză apare prezentarea în română.",
  },
  { key: "sortIdx", label: "Ordine în pagină", type: "number", hint: "1 apare primul." },
  {
    key: "active",
    label: "Vizibil pe site",
    type: "boolean",
    hint: "Oprit, cardul nu apare pe site, dar datele rămân aici.",
  },
];

export default async function AdminAgentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ id?: string; new?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;

  const agents = await prisma.shippingAgent.findMany({
    orderBy: [{ sortIdx: "asc" }, { name: "asc" }],
  });
  const editing = sp.new ? null : agents.find((a) => a.id === sp.id);

  const initial = editing
    ? {
        id: editing.id,
        kind: editing.kind,
        name: editing.name,
        zone: editing.zone ?? "",
        phone: editing.phone ?? "",
        whatsapp: editing.whatsapp ?? "",
        email: editing.email ?? "",
        website: editing.website ?? "",
        logoUrl: editing.logoUrl ?? "",
        descRo: editing.descRo ?? "",
        descEn: editing.descEn ?? "",
        sortIdx: editing.sortIdx,
        active: editing.active,
      }
    : {
        kind: "TRANSPORT",
        name: "",
        zone: "",
        phone: "",
        whatsapp: "",
        email: "",
        website: "",
        logoUrl: "",
        descRo: "",
        descEn: "",
        sortIdx: agents.length + 1,
        active: true,
      };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold">Transport &amp; agenți</h1>
        <a
          href="?new=1"
          data-testid="agent-new"
          className="rounded-xl bg-ink px-5 py-2 text-sm font-bold text-ivory hover:bg-wing-orange"
        >
          + Adaugă
        </a>
      </div>
      <p className="mb-6 text-sm text-ink/60">
        Fiecare transportator și agent are cardul lui în pagina „Transport și Agenți”. Se pot
        adăuga oricâți.
      </p>

      {agents.length > 0 && (
        <div className="mb-8 overflow-x-auto rounded-2xl border border-ink/10 bg-white">
          <table className="w-full min-w-[36rem] text-sm" data-testid="admin-agents-table">
            <tbody>
              {agents.map((a) => (
                <tr key={a.id} className="border-b border-ink/5 last:border-0">
                  <td className="w-10 px-4 py-2.5 text-ink/40">{a.sortIdx}</td>
                  <td className="px-4 py-2.5 font-semibold">{a.name}</td>
                  <td className="px-4 py-2.5 text-ink/60">{KIND_LABEL[a.kind] ?? a.kind}</td>
                  <td className="max-w-xs truncate px-4 py-2.5 text-ink/60">{a.zone}</td>
                  <td className="px-4 py-2.5">
                    {!a.active && (
                      <span className="rounded bg-ink/10 px-2 py-0.5 text-xs font-bold">ascuns</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-end">
                    <a
                      href={`?id=${a.id}`}
                      className="-my-1 inline-block rounded-lg px-3 py-2 font-semibold text-wing-blue hover:bg-wing-blue/10 hover:underline"
                      data-testid="agent-edit"
                    >
                      Editează
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <RecordEditor
        key={editing?.id ?? "new"}
        endpoint="/api/admin/agents"
        title={editing ? `Editează: ${editing.name}` : "Transportator sau agent nou"}
        initial={initial}
        fields={FIELDS}
        help={
          <>
            <p>
              <strong>Unde se vede.</strong> În pagina <em>Transport și Agenți</em>, sub textul de
              prezentare, câte un card pentru fiecare. Transportatorii și agenții apar în grupuri
              separate.
            </p>
            <p className="mt-2">
              <strong>Textul de sus al paginii</strong> se schimbă din <em>Pagini</em> →{" "}
              <em>Transport și Agenți</em>. Prezentarea unui transportator anume se pune aici, în
              cardul lui.
            </p>
          </>
        }
      />
    </div>
  );
}
