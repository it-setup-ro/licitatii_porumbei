import { notFound } from "next/navigation";
import { getTranslations, getLocale, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { Link } from "@/i18n/navigation";
import { cardInclude, toCardData } from "@/lib/queries";
import AuctionCard from "@/components/AuctionCard";
import RichText from "@/components/RichText";

export const dynamic = "force-dynamic";

export default async function ContestPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("contests");
  const currentLocale = await getLocale();

  const contest = await prisma.contest.findFirst({
    where: { slug, published: true },
    include: { auctions: { include: cardInclude, orderBy: { endsAt: "asc" } } },
  });
  if (!contest) notFound();

  const title = currentLocale === "en" ? contest.titleEn : contest.titleRo;
  const desc = currentLocale === "en" ? contest.descEn : contest.descRo;
  const rules = currentLocale === "en" ? contest.rulesEn : contest.rulesRo;

  const fmt = (d: Date) =>
    new Intl.DateTimeFormat(currentLocale === "ro" ? "ro-RO" : "en-GB", {
      dateStyle: "long",
    }).format(d);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <Link href="/contests" className="text-sm text-ink/60 hover:text-wing-orange">
        {t("backToList")}
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className="rounded-full bg-wing-blue px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
          {t(`status${contest.status}` as "statusUPCOMING")}
        </span>
        <span className="text-sm text-ink/50">
          {t("period")}: {fmt(contest.startsAt)} – {fmt(contest.endsAt)}
        </span>
      </div>

      <h1 className="font-display mt-3 text-3xl font-bold" data-testid="contest-title">
        {title}
      </h1>
      {desc && <p className="mt-3 leading-relaxed text-ink/80">{desc}</p>}

      {rules && (
        <section className="mt-8 rounded-2xl border border-ink/10 bg-white p-6" data-testid="contest-rules">
          <h2 className="font-display mb-3 text-xl font-bold">{t("rules")}</h2>
          <RichText text={rules} />
        </section>
      )}

      <section className="mt-10" data-testid="contest-lots">
        <h2 className="font-display mb-5 text-2xl font-bold">{t("lots")}</h2>
        {contest.auctions.length === 0 ? (
          <p className="text-ink/50">{t("noLots")}</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {contest.auctions.map((a) => (
              <AuctionCard key={a.id} auction={toCardData(a)} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
