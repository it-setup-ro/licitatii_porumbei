import { setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import ResendEmailButton from "@/components/admin/ResendEmailButton";
import EmailSetupCard from "@/components/admin/EmailSetupCard";
import { smtpStatusFull } from "@/lib/smtp-status";
import { smtpConfigPublic } from "@/lib/smtp-config";

export const dynamic = "force-dynamic";

/**
 * Jurnalul de e-mailuri.
 *
 * Fiecare mesaj se scrie aici înainte să plece, iar acum se vede și dacă a
 * plecat: un e-mail refuzat de serverul de e-mail era înainte invizibil, deși
 * un câștigător putea rămâne fără datele de plată și apoi să fie anulat pentru
 * neplată. De aici se poate și retrimite.
 */

const STARI = [
  { key: "", label: "Toate" },
  { key: "sent", label: "Trimise" },
  { key: "failed", label: "Eșuate" },
  { key: "pending", label: "Neplecate" },
];

const PE_PAGINA = 50;

export default async function AdminEmailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const status = STARI.some((s) => s.key === sp.status) ? (sp.status ?? "") : "";
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const [smtp, smtpConfig] = await Promise.all([smtpStatusFull(), smtpConfigPublic()]);

  const contains = { contains: q, mode: "insensitive" as const };
  const where = {
    ...(status === "sent" ? { sentAt: { not: null } } : {}),
    ...(status === "failed" ? { error: { not: null } } : {}),
    ...(status === "pending" ? { sentAt: null, error: null } : {}),
    ...(q ? { OR: [{ toEmail: contains }, { subject: contains }] } : {}),
  };

  const [emails, total, esuate] = await Promise.all([
    prisma.emailLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PE_PAGINA,
      take: PE_PAGINA,
    }),
    prisma.emailLog.count({ where }),
    prisma.emailLog.count({ where: { error: { not: null } } }),
  ]);

  // pentru caseta de sus: cum stam cu trimiterea, pe toata istoria
  const [trimise, neplecate] = await Promise.all([
    prisma.emailLog.count({ where: { sentAt: { not: null } } }),
    prisma.emailLog.count({ where: { sentAt: null, error: null } }),
  ]);

  const when = new Intl.DateTimeFormat("ro-RO", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Bucharest",
  });
  const pagini = Math.max(1, Math.ceil(total / PE_PAGINA));
  const qs = (extra: Record<string, string>) => {
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    if (status) u.set("status", status);
    for (const [k, v] of Object.entries(extra)) if (v) u.set(k, v);
    return u.toString();
  };

  return (
    <div>
      <h1 className="font-display mb-2 text-2xl font-bold sm:text-3xl">E-mailuri</h1>

      <div className="mb-6">
        <EmailSetupCard
          configurat={smtp.configurat}
          host={smtp.host}
          port={smtp.port}
          user={smtp.user}
          furnizor={smtp.furnizor}
          expeditor={smtp.expeditor}
          limita={smtp.limita}
          trimise={trimise}
          esuate={esuate}
          sursa={smtp.sursa}
          config={smtpConfig}
          neplecate={neplecate}
        />
      </div>

      {smtp.configurat && (
        esuate > 0 && (
          <p
            className="mb-6 rounded-2xl border border-wing-red/40 bg-wing-red/5 p-4 text-sm"
            data-testid="emails-failed-warning"
          >
            <strong>{esuate} mesaje au fost refuzate</strong> de serverul de e-mail. Deschide-le,
            vezi motivul și apasă „Trimite din nou” după ce ai reparat cauza.
          </p>
        )
      )}

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1 rounded-full border border-ink/15 p-1">
          {STARI.map((s) => (
            <a
              key={s.key || "all"}
              href={`?${new URLSearchParams({ ...(q ? { q } : {}), ...(s.key ? { status: s.key } : {}) }).toString()}`}
              data-testid={`emails-tab-${s.key || "all"}`}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
                status === s.key ? "bg-ink text-ivory" : "hover:bg-ink/5"
              }`}
            >
              {s.label}
            </a>
          ))}
        </div>
        <form method="get" className="flex gap-2">
          {status && <input type="hidden" name="status" value={status} />}
          <input
            name="q"
            defaultValue={q}
            placeholder="adresă sau subiect"
            data-testid="emails-search"
            className="rounded-xl border border-ink/20 bg-ivory-soft px-3 py-2 text-sm outline-none focus:border-wing-blue"
          />
          <button
            type="submit"
            className="rounded-xl border border-ink/20 px-4 py-2 text-sm font-semibold hover:border-wing-blue"
          >
            Caută
          </button>
        </form>
      </div>

      {emails.length === 0 ? (
        <p className="text-ink/50" data-testid="emails-empty">
          Niciun mesaj aici.
        </p>
      ) : (
        <div className="space-y-3" data-testid="emails-list">
          {emails.map((e) => (
            <details
              key={e.id}
              data-testid="email-row"
              className={`overflow-hidden rounded-2xl border bg-white ${
                e.error ? "border-wing-red/40" : "border-ink/10"
              }`}
            >
              <summary className="cursor-pointer px-5 py-4">
                <span className="font-semibold">{e.subject}</span>
                <span className="ms-2 text-sm text-ink/60">{e.toEmail}</span>
                <span className="ms-2 text-xs text-ink/40">{when.format(e.createdAt)}</span>
                {e.error ? (
                  <span
                    className="ms-2 rounded bg-wing-red/10 px-2 py-0.5 text-xs font-bold text-wing-red"
                    data-testid="email-failed"
                  >
                    refuzat
                  </span>
                ) : e.sentAt ? (
                  <span
                    className="ms-2 rounded bg-green-100 px-2 py-0.5 text-xs font-bold text-green-800"
                    data-testid="email-sent"
                  >
                    trimis
                  </span>
                ) : (
                  <span className="ms-2 rounded bg-ink/5 px-2 py-0.5 text-xs font-bold text-ink/50">
                    neplecat
                  </span>
                )}
                {e.attempts > 1 && (
                  <span className="ms-2 text-xs text-ink/40">{e.attempts} încercări</span>
                )}
              </summary>
              <div className="border-t border-ink/10 bg-ivory-soft px-5 py-4">
                {e.error && (
                  <p className="mb-3 text-sm text-wing-red" data-testid="email-error">
                    Serverul de e-mail a răspuns: {e.error}
                  </p>
                )}
                <pre
                  data-testid="email-body"
                  className="overflow-x-auto whitespace-pre-wrap break-words text-sm leading-relaxed"
                >
                  {e.body}
                </pre>
                <div className="mt-4">
                  <ResendEmailButton emailId={e.id} />
                </div>
              </div>
            </details>
          ))}
        </div>
      )}

      {pagini > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm" data-testid="emails-pages">
          <span className="text-ink/60">
            Pagina {page} din {pagini} · {total} mesaje
          </span>
          <span className="flex gap-2">
            {page > 1 && (
              <a
                href={`?${qs({ page: String(page - 1) })}`}
                className="rounded-xl border border-ink/20 px-4 py-2 font-semibold hover:border-wing-blue"
              >
                ← mai noi
              </a>
            )}
            {page < pagini && (
              <a
                href={`?${qs({ page: String(page + 1) })}`}
                data-testid="emails-next"
                className="rounded-xl border border-ink/20 px-4 py-2 font-semibold hover:border-wing-blue"
              >
                mai vechi →
              </a>
            )}
          </span>
        </div>
      )}
    </div>
  );
}
