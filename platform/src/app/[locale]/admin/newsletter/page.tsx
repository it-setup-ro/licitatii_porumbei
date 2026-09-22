import { getLocale, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import Pager from "@/components/admin/Pager";
import RowActions from "@/components/admin/RowActions";

export const dynamic = "force-dynamic";

/**
 * Lista abonatilor la newsletter.
 *
 * Se vede si textul bifat de fiecare, cu data: asta e dovada de consimtamant
 * ceruta de GDPR. Exportul CSV e pentru serviciul de trimitere, cand il alegem.
 */
export default async function AdminNewsletterPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const PE_PAGINA = 100;
  const currentLocale = await getLocale();

  const [rows, active, gone] = await Promise.all([
    prisma.newsletterSubscriber.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PE_PAGINA,
      take: PE_PAGINA,
    }),
    prisma.newsletterSubscriber.count({ where: { unsubscribedAt: null } }),
    prisma.newsletterSubscriber.count({ where: { unsubscribedAt: { not: null } } }),
  ]);

  const fmt = new Intl.DateTimeFormat(currentLocale === "ro" ? "ro-RO" : "en-GB", {
    dateStyle: "short",
    timeStyle: "short",
  });

  const total = await prisma.newsletterSubscriber.count();

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold">Abonați la newsletter</h1>
        {/* descarcare de fisier, nu navigare: <Link> ar incerca sa randeze o pagina */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/api/admin/newsletter/export"
          data-testid="newsletter-export"
          className="rounded-xl border border-ink/20 px-4 py-2 text-sm font-semibold text-wing-blue hover:border-wing-blue"
        >
          ↓ Descarcă CSV
        </a>
      </div>

      <p className="mb-5 text-ink/70" data-testid="newsletter-counts">
        <strong>{active}</strong> abonați activi · {gone} dezabonați
      </p>

      {rows.length === 0 ? (
        <p className="text-ink/50" data-testid="no-subscribers">
          Nimeni abonat deocamdată.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-ink/10 bg-white">
          <table className="w-full text-sm" data-testid="subscribers-table">
            <thead className="border-b border-ink/10 text-start text-ink/60">
              <tr>
                <th className="px-4 py-3">E-mail</th>
                <th className="px-4 py-3">Limbă</th>
                <th className="px-4 py-3">Acord dat la</th>
                <th className="px-4 py-3">Stare</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-ink/5" data-testid="subscriber-row">
                  <td className="px-4 py-3 font-medium">{r.email}</td>
                  <td className="px-4 py-3 uppercase text-ink/60">{r.locale}</td>
                  <td className="px-4 py-3 text-ink/60" title={r.consentText}>
                    {fmt.format(r.consentAt)}
                  </td>
                  <td className="px-4 py-3">
                    {r.unsubscribedAt ? (
                      <span className="text-ink/50">dezabonat {fmt.format(r.unsubscribedAt)}</span>
                    ) : (
                      <span className="font-semibold text-green-700">activ</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-end">
                    <RowActions
                      testid="subscriber-row-actions"
                      remove={{
                        url: `/api/admin/newsletter/${r.id}`,
                        confirm: `Ștergi definitiv abonatul ${r.email}? Nu se poate da înapoi.`,
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pager page={page} total={total} perPage={PE_PAGINA} label="abonați" />
    </div>
  );
}
