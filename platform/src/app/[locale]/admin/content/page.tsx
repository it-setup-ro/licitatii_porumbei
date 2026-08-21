import { setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import RecordEditor from "@/components/admin/RecordEditor";

export const dynamic = "force-dynamic";

const LABELS: Record<string, string> = {
  regulament: "Regulament",
  "info-licitatii": "Informații licitații",
  "alte-info": "Alte informații",
  "transport-agenti": "Transport și Agenți",
  "despre-noi": "Despre noi",
  contact: "Contact",
};

export default async function AdminContentPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ slug?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;

  const pages = await prisma.contentPage.findMany({ orderBy: { slug: "asc" } });
  const active = pages.find((p) => p.slug === sp.slug) ?? pages[0];

  return (
    <div>
      <h1 className="font-display mb-6 text-3xl font-bold">Pagini de conținut</h1>

      <div className="mb-6 flex flex-wrap gap-2">
        {pages.map((p) => (
          <a
            key={p.slug}
            href={`?slug=${p.slug}`}
            data-testid={`content-tab-${p.slug}`}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
              active?.slug === p.slug
                ? "bg-ink text-ivory"
                : "border border-ink/15 bg-white hover:border-ink/40"
            }`}
          >
            {LABELS[p.slug] ?? p.slug}
          </a>
        ))}
      </div>

      {active && (
        <RecordEditor
          key={active.slug}
          endpoint="/api/admin/content"
          title={LABELS[active.slug] ?? active.slug}
          initial={{
            slug: active.slug,
            titleRo: active.titleRo,
            titleEn: active.titleEn,
            bodyRo: active.bodyRo,
            bodyEn: active.bodyEn,
          }}
          fields={[
            { key: "titleRo", label: "Titlu (RO)", type: "text" },
            { key: "titleEn", label: "Titlu (EN)", type: "text" },
            {
              key: "bodyRo",
              label: "Conținut (RO)",
              type: "textarea",
              rows: 14,
              hint: "Folosește „## " + "Titlu” pentru subtitluri și un rând gol între paragrafe.",
            },
            { key: "bodyEn", label: "Conținut (EN)", type: "textarea", rows: 14 },
          ]}
        />
      )}
    </div>
  );
}
