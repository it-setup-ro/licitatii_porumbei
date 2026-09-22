import { setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { saleStatus } from "@/lib/lots";
import RecordEditor, { type FieldDef } from "@/components/admin/RecordEditor";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: "ciornă", cls: "bg-ink/10 text-ink/70" },
  UPCOMING: { label: "programată", cls: "bg-wing-blue/10 text-wing-blue" },
  LIVE: { label: "activă", cls: "bg-wing-red/10 text-wing-red" },
  CLOSED: { label: "încheiată", cls: "bg-ink/10 text-ink/60" },
};

export default async function AdminSalesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ id?: string; new?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;

  const [sales, breeders, settings] = await Promise.all([
    prisma.sale.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        breeder: true,
        lots: { select: { status: true, _count: { select: { auctions: true } } } },
      },
    }),
    prisma.breeder.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    getSettings(),
  ]);
  const editing = sp.new ? null : sales.find((s) => s.id === sp.id);

  const fields: FieldDef[] = [
    {
      key: "breederId",
      label: "Crescătorul",
      type: "select",
      required: true,
      options: [
        { value: "", label: "— alege —" },
        ...breeders.map((b) => ({ value: b.id, label: b.name })),
      ],
    },
    {
      key: "commissionPercent",
      label: "Comision (%)",
      type: "number",
      required: true,
      hint: "Cât reții din vânzări pentru crescătorul acesta: 5, 10, 15, 16, 23… Cumpărătorul nu îl vede. Se poate schimba și după pornire.",
    },
    {
      key: "slug",
      label: "Identificator URL (slug)",
      type: "text",
      required: true,
      slugify: true,
      full: true,
      hint: "Apare în adresă: /sales/burca-ionut-2026. Se curăță singur în timp ce scrii.",
    },
    {
      key: "titleRo",
      label: "Titlu (RO)",
      type: "text",
      required: true,
      hint: "Ex.: Licitația crescătorului Burca Ionuț",
    },
    { key: "titleEn", label: "Titlu (EN)", type: "text", required: true },
    {
      key: "descRo",
      label: "Descriere (RO)",
      type: "textarea",
      rows: 6,
      hint: "Ce se vinde, de ce merită. Un rând gol între paragrafe.",
    },
    { key: "descEn", label: "Descriere (EN)", type: "textarea", rows: 4 },
    {
      key: "coverUrl",
      label: "Imagine copertă",
      type: "image",
      full: true,
      hint: "Apare lată, sus în pagina licitației și pe cardul din lista de licitații.",
    },
  ];

  const initial = editing
    ? {
        id: editing.id,
        breederId: editing.breederId,
        commissionPercent: editing.commissionPercent,
        slug: editing.slug,
        titleRo: editing.titleRo,
        titleEn: editing.titleEn,
        descRo: editing.descRo ?? "",
        descEn: editing.descEn ?? "",
        coverUrl: editing.coverUrl ?? "",
      }
    : {
        breederId: "",
        commissionPercent: settings.commissionPercent,
        slug: "",
        titleRo: "",
        titleEn: "",
        descRo: "",
        descEn: "",
        coverUrl: "",
      };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold">Licitații pe loturi</h1>
        <a
          href="?new=1"
          data-testid="sale-new"
          className="rounded-xl bg-ink px-5 py-2 text-sm font-bold text-ivory hover:bg-wing-orange"
        >
          + Licitație nouă
        </a>
      </div>
      <p className="mb-6 text-sm text-ink/60">
        Fiecare licitație e a unui crescător și are până la {settings.saleMaxLots} loturi, câte
        cel mult {settings.lotMaxPigeons} de porumbei. Loturile și porumbeii se adaugă din pagina
        licitației — butonul <em>Deschide</em>.
      </p>

      {breeders.length === 0 && (
        <p
          className="mb-6 rounded-2xl border border-wing-orange/40 bg-wing-orange/5 p-4 text-sm"
          data-testid="sales-no-breeders"
        >
          Nu există încă niciun crescător.{" "}
          <a href={`/${locale}/admin/breeders?new=1`} className="font-semibold text-wing-blue underline">
            Adaugă întâi crescătorul
          </a>
          , apoi licitația lui.
        </p>
      )}

      {sales.length > 0 && (
        <div className="mb-8 overflow-x-auto rounded-2xl border border-ink/10 bg-white">
          <table className="w-full min-w-[40rem] text-sm" data-testid="admin-sales-table">
            <tbody>
              {sales.map((s) => {
                const st = STATUS_LABEL[saleStatus(s.lots)];
                const porumbei = s.lots.reduce((n, l) => n + l._count.auctions, 0);
                return (
                  <tr key={s.id} className="border-b border-ink/5 last:border-0" data-testid="sale-row">
                    <td className="px-4 py-2.5">
                      <p className="font-semibold">{s.titleRo}
                      {s.archivedAt && (
                        <span className="ms-2 rounded bg-wing-orange/15 px-1.5 py-0.5 text-xs font-bold text-wing-orange" data-testid="sale-archived-badge">
                          arhivată
                        </span>
                      )}</p>
                      <p className="text-xs text-ink/50">{s.breeder.name}</p>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded px-2 py-0.5 text-xs font-bold ${st.cls}`}>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-ink/60">
                      {s.lots.length} loturi · {porumbei} porumbei
                    </td>
                    <td className="px-4 py-2.5 text-ink/60">{s.commissionPercent}%</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-end">
                      <a
                        href={`?id=${s.id}`}
                        className="-my-1 me-1 inline-block rounded-lg px-3 py-2 font-semibold text-ink/60 hover:bg-ink/5"
                        data-testid="sale-edit"
                      >
                        Editează
                      </a>
                      <a
                        href={`/${locale}/admin/sales/${s.id}`}
                        className="-my-1 inline-block rounded-lg bg-ink px-3 py-2 font-semibold text-ivory hover:bg-wing-orange"
                        data-testid="sale-open"
                      >
                        Deschide
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <RecordEditor
        key={editing?.id ?? "new"}
        endpoint="/api/admin/sales"
        title={editing ? `Editează: ${editing.titleRo}` : "Licitație nouă"}
        initial={initial}
        fields={fields}
        help={
          <>
            <p>
              <strong>Pașii:</strong> creezi licitația aici, apoi o deschizi, adaugi Lotul 1 cu
              orele lui, pui porumbeii și apeși <em>Start lot</em>. Lotul 2 îl pornești când vrei,
              chiar și peste câteva zile.
            </p>
            <p className="mt-2">
              <strong>Perioada licitației</strong> nu se scrie aici: vine singură din loturi —
              începe cu primul, se termină cu ultimul.
            </p>
          </>
        }
      />
    </div>
  );
}
