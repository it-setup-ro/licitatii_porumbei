import { setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import RecordEditor, { type FieldDef } from "@/components/admin/RecordEditor";

export const dynamic = "force-dynamic";

const CATEGORY_OPTIONS = [
  { value: "FEED", label: "Hrană" },
  { value: "SUPPLEMENTS", label: "Suplimente" },
  { value: "ACCESSORIES", label: "Accesorii" },
  { value: "RINGS", label: "Inele" },
  { value: "OTHER", label: "Altele" },
];

const FIELDS: FieldDef[] = [
  { key: "slug", label: "Identificator URL (slug)", type: "text", hint: "litere mici, cifre, cratime" },
  { key: "category", label: "Categorie", type: "select", options: CATEGORY_OPTIONS },
  { key: "nameRo", label: "Denumire (RO)", type: "text" },
  { key: "nameEn", label: "Denumire (EN)", type: "text" },
  { key: "descRo", label: "Descriere (RO)", type: "textarea", rows: 3 },
  { key: "descEn", label: "Descriere (EN)", type: "textarea", rows: 3 },
  { key: "priceCents", label: "Preț (EUR)", type: "money" },
  { key: "stock", label: "Stoc", type: "number" },
  { key: "imageUrl", label: "Imagine", type: "image", full: true },
  { key: "sortIdx", label: "Ordine afișare", type: "number" },
  { key: "active", label: "Activ în magazin", type: "boolean" },
];

export default async function AdminProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ id?: string; new?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;

  const products = await prisma.product.findMany({ orderBy: [{ sortIdx: "asc" }] });
  const editing = sp.new ? null : products.find((p) => p.id === sp.id);

  const initial = editing
    ? {
        id: editing.id,
        slug: editing.slug,
        category: editing.category,
        nameRo: editing.nameRo,
        nameEn: editing.nameEn,
        descRo: editing.descRo ?? "",
        descEn: editing.descEn ?? "",
        priceCents: editing.priceCents / 100,
        stock: editing.stock,
        imageUrl: editing.imageUrl ?? "",
        sortIdx: editing.sortIdx,
        active: editing.active,
      }
    : {
        slug: "",
        category: "FEED",
        nameRo: "",
        nameEn: "",
        descRo: "",
        descEn: "",
        priceCents: 0,
        stock: 0,
        imageUrl: "",
        sortIdx: products.length + 1,
        active: true,
      };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold">Produse</h1>
        <a
          href="?new=1"
          data-testid="product-new"
          className="rounded-xl bg-ink px-5 py-2 text-sm font-bold text-ivory hover:bg-wing-orange"
        >
          + Produs nou
        </a>
      </div>

      <div className="mb-8 overflow-x-auto rounded-2xl border border-ink/10 bg-white">
        <table className="w-full min-w-[36rem] text-sm" data-testid="admin-products-table">
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b border-ink/5 last:border-0">
                <td className="px-4 py-2.5 font-semibold">{p.nameRo}</td>
                <td className="px-4 py-2.5 text-ink/60">{p.category}</td>
                <td className="px-4 py-2.5">{formatMoney(p.priceCents, p.currency, "ro")}</td>
                <td className="px-4 py-2.5 text-ink/60">stoc: {p.stock}</td>
                <td className="px-4 py-2.5">
                  {!p.active && (
                    <span className="rounded bg-ink/10 px-2 py-0.5 text-xs font-bold">inactiv</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <a
                    href={`?id=${p.id}`}
                    className="-my-1 inline-block rounded-lg px-3 py-2 font-semibold text-wing-blue hover:bg-wing-blue/10 hover:underline"
                    data-testid="product-edit"
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
        endpoint="/api/admin/products"
        title={editing ? `Editează: ${editing.nameRo}` : "Produs nou"}
        initial={initial}
        fields={FIELDS}
      />
    </div>
  );
}
