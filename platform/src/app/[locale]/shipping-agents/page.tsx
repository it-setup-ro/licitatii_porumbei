import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import RichText from "@/components/RichText";
import { telHref, whatsappHref } from "@/lib/contact-links";
import {  } from "@/lib/locales";

export const dynamic = "force-dynamic";

/**
 * Transport și Agenți.
 *
 * Sus, textul de prezentare din Administrare → Pagini. Dedesubt, câte un card
 * pentru fiecare transportator și agent, din Administrare → Transport &
 * agenți. Înainte pagina era un singur bloc de text: după primul transportator
 * nu mai era loc pentru al doilea.
 */

type Agent = {
  id: string;
  kind: string;
  name: string;
  zone: string | null;
  descRo: string | null;
  descEn: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  logoUrl: string | null;
};

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const currentLocale = await getLocale();
  const t = await getTranslations("agents");

  const [page, agents] = await Promise.all([
    prisma.contentPage.findUnique({ where: { slug: "transport-agenti" } }),
    prisma.shippingAgent.findMany({
      where: { active: true },
      orderBy: [{ sortIdx: "asc" }, { name: "asc" }],
    }),
  ]);

  // conținutul scris de administrator: română sau, altfel, engleză
  const en = currentLocale !== "ro";
  const title = page ? (en ? page.titleEn : page.titleRo) : t("title");
  const body = page ? (en ? page.bodyEn : page.bodyRo) : null;

  const groups = [
    { kind: "TRANSPORT", label: t("transporters") },
    { kind: "AGENT", label: t("agents") },
  ]
    .map((g) => ({ ...g, items: agents.filter((a) => a.kind === g.kind) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="font-display mb-6 text-3xl font-bold" data-testid="content-title">
        {title}
      </h1>
      {body && (
        <div data-testid="content-body">
          <RichText text={body} />
        </div>
      )}

      {groups.length === 0 ? (
        <p className="mt-10 text-ink/50" data-testid="agents-empty">
          {t("empty")}
        </p>
      ) : (
        groups.map((g) => (
          <section key={g.kind} className="mt-10" data-testid={`agents-${g.kind.toLowerCase()}`}>
            <h2 className="font-display mb-4 text-2xl font-bold">{g.label}</h2>
            <div className="space-y-5">
              {g.items.map((a) => (
                <AgentCard key={a.id} agent={a} en={en} websiteLabel={t("website")} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function AgentCard({
  agent: a,
  en,
  websiteLabel,
}: {
  agent: Agent;
  en: boolean;
  websiteLabel: string;
}) {
  // fără prezentare în engleză, vizitatorul englez vede textul românesc, nu un card gol
  const desc = en ? (a.descEn ?? a.descRo) : a.descRo;
  const tel = a.phone ? telHref(a.phone) : null;
  const wa = a.whatsapp ? whatsappHref(a.whatsapp) : null;
  const buton =
    "rounded-full border border-ink/15 px-4 py-2 text-sm font-semibold transition-colors hover:border-wing-blue hover:text-wing-blue";

  return (
    <article className="rounded-2xl border border-ink/10 bg-white p-6" data-testid="agent-card">
      <div className="flex items-center gap-4">
        {a.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={a.logoUrl}
            alt={a.name}
            className="h-16 w-16 shrink-0 rounded-xl border border-ink/10 object-cover"
          />
        ) : (
          <span
            className="font-display flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-ink text-2xl font-bold text-wing-yellow"
            aria-hidden="true"
          >
            {a.name.charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          <h3 className="font-display text-xl font-bold leading-tight">{a.name}</h3>
          {a.zone && (
            <p className="mt-1 text-sm text-ink/60" data-testid="agent-zone">
              {a.zone}
            </p>
          )}
        </div>
      </div>

      {desc && (
        <div className="mt-4 text-ink/80">
          <RichText text={desc} />
        </div>
      )}

      {(tel || wa || a.email || a.website) && (
        <div className="mt-5 flex flex-wrap gap-2">
          {wa && (
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="agent-whatsapp"
              className="rounded-full bg-[#1f9d55] px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90"
            >
              WhatsApp
            </a>
          )}
          {tel && (
            <a href={tel} data-testid="agent-phone" className={buton}>
              ☎ {a.phone}
            </a>
          )}
          {a.email && (
            <a href={`mailto:${a.email}`} data-testid="agent-email" className={buton}>
              ✉ {a.email}
            </a>
          )}
          {a.website && (
            <a
              href={a.website}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="agent-website"
              className={buton}
            >
              {websiteLabel} ↗
            </a>
          )}
        </div>
      )}
    </article>
  );
}
