import { setRequestLocale, getLocale } from "next-intl/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * E-mailurile pe care platforma le-a „trimis".
 *
 * Cât timp nu e conectat un serviciu real de e-mail, mesajele se scriu doar în
 * tabelul EmailLog și nu ajung nicăieri. Pagina asta le face vizibile, ca să se
 * poată testa fluxurile care depind de e-mail — mai ales resetarea parolei.
 *
 * După conectarea unui serviciu real rămâne utilă ca jurnal: se vede ce a
 * plecat și când.
 */
export default async function AdminEmailsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const currentLocale = await getLocale();

  const emails = await prisma.emailLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const when = new Intl.DateTimeFormat(currentLocale === "ro" ? "ro-RO" : "en-GB", {
    dateStyle: "short",
    timeStyle: "short",
  });

  return (
    <div>
      <h1 className="font-display mb-2 text-2xl font-bold sm:text-3xl">E-mailuri trimise</h1>
      <p className="mb-6 rounded-2xl border border-wing-orange/40 bg-wing-orange/5 p-4 text-sm">
        Nu e conectat încă un serviciu de e-mail, deci mesajele nu pleacă efectiv — se scriu aici.
        Linkurile de resetare a parolei se pot citi de mai jos, în timpul testelor.
      </p>

      {emails.length === 0 ? (
        <p className="text-ink/50" data-testid="emails-empty">
          Niciun mesaj încă.
        </p>
      ) : (
        <div className="space-y-3" data-testid="emails-list">
          {emails.map((e) => (
            <details
              key={e.id}
              data-testid="email-row"
              className="overflow-hidden rounded-2xl border border-ink/10 bg-white"
            >
              <summary className="cursor-pointer px-5 py-4">
                <span className="font-semibold">{e.subject}</span>
                <span className="ml-2 text-sm text-ink/60">{e.toEmail}</span>
                <span className="ml-2 text-xs text-ink/40">{when.format(e.createdAt)}</span>
              </summary>
              <pre
                data-testid="email-body"
                className="overflow-x-auto whitespace-pre-wrap break-words border-t border-ink/10 bg-ivory-soft px-5 py-4 text-sm leading-relaxed"
              >
                {e.body}
              </pre>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
