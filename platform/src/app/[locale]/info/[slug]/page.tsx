import { notFound } from "next/navigation";
import { getLocale, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { fillPlaceholders } from "@/lib/legal-placeholders";
import RichText from "@/components/RichText";

export const dynamic = "force-dynamic";

/** Sub /info sunt permise paginile din meniul Informații și textele legale. */
const ALLOWED = [
  "regulament",
  "info-licitatii",
  "alte-info",
  "termeni-si-conditii",
  "politica-de-confidentialitate",
];
const LEGAL = ["termeni-si-conditii", "politica-de-confidentialitate"];

export default async function InfoPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const currentLocale = await getLocale();

  if (!ALLOWED.includes(slug)) notFound();
  const [page, s] = await Promise.all([prisma.contentPage.findUnique({ where: { slug } }), getSettings()]);
  if (!page) notFound();

  const en = currentLocale === "en";
  const title = en ? page.titleEn : page.titleRo;
  // Datele firmei și regulile vin din Setări — clientul: „firma va fi cea care
  // se va scrie în Setări". Un câmp gol apare vizibil ca „de completat".
  const body = fillPlaceholders(en ? page.bodyEn : page.bodyRo, {
    firma: s.companyName,
    cui: s.companyCui,
    regcom: s.companyRegCom,
    sediu: s.companyAddress,
    email: s.contactEmail,
    telefon: s.contactPhone,
    site: (process.env.PUBLIC_BASE_URL ?? "").replace(/^https?:\/\//, "").replace(/\/$/, ""),
    ore_bolnav: String(s.aftersalesSickHours),
    ore_mort: String(s.aftersalesDeadHours),
    luni_infertil: String(s.aftersalesInfertileMonths),
    fereastra_minute: String(s.snipeWindowMinutes),
    prelungire_minute: String(s.extensionMinutes),
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display mb-2 text-3xl font-bold" data-testid="content-title">
        {title}
      </h1>
      {LEGAL.includes(slug) && (
        <p className="mb-6 text-sm text-ink/50" data-testid="content-updated">
          {en ? "Last updated: " : "Ultima actualizare: "}
          {new Intl.DateTimeFormat(en ? "en-GB" : "ro-RO", { dateStyle: "long", timeZone: "Europe/Bucharest" }).format(
            page.updatedAt
          )}
        </p>
      )}
      <div data-testid="content-body">
        <RichText text={body} />
      </div>
    </div>
  );
}
