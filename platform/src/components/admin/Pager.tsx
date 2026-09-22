/**
 * Paginarea listelor din administrare.
 *
 * Până acum fiecare listă arăta primele N rânduri și restul dispărea tăcut: la
 * câteva sute de înregistrări, date reale pur și simplu nu se mai vedeau, fără
 * niciun avertisment. Componenta asta e server-side: doar linkuri.
 */
export default function Pager({
  page,
  total,
  perPage,
  params = {},
  label = "înregistrări",
  testid = "pager",
}: {
  page: number;
  total: number;
  perPage: number;
  /** filtrele curente, păstrate în linkuri */
  params?: Record<string, string>;
  label?: string;
  testid?: string;
}) {
  const pagini = Math.max(1, Math.ceil(total / perPage));
  if (pagini <= 1) return null;

  const link = (p: number) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) u.set(k, v);
    if (p > 1) u.set("page", String(p));
    const qs = u.toString();
    return qs ? `?${qs}` : "?";
  };

  const buton = "rounded-xl border border-ink/20 px-4 py-2 font-semibold hover:border-wing-blue";

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm" data-testid={testid}>
      <span className="text-ink/60">
        Pagina {page} din {pagini} · {total} {label}
      </span>
      <span className="flex gap-2">
        {page > 1 && (
          <a href={link(page - 1)} data-testid={`${testid}-prev`} className={buton}>
            ← mai noi
          </a>
        )}
        {page < pagini && (
          <a href={link(page + 1)} data-testid={`${testid}-next`} className={buton}>
            mai vechi →
          </a>
        )}
      </span>
    </div>
  );
}
