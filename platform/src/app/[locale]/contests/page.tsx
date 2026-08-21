import { getTranslations, getLocale, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { Link } from "@/i18n/navigation";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  UPCOMING: "bg-wing-blue text-white",
  ACTIVE: "bg-wing-red text-white",
  FINISHED: "bg-ink/70 text-ivory",
};

export default async function ContestsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("contests");
  const currentLocale = await getLocale();

  const contests = await prisma.contest.findMany({
    where: { published: true },
    include: { _count: { select: { auctions: true } } },
    orderBy: [{ status: "asc" }, { startsAt: "desc" }],
  });

  const fmt = (d: Date) =>
    new Intl.DateTimeFormat(currentLocale === "ro" ? "ro-RO" : "en-GB", {
      dateStyle: "medium",
    }).format(d);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="font-display text-3xl font-bold">{t("title")}</h1>
      <p className="mt-2 text-ink/70">{t("subtitle")}</p>

      {contests.length === 0 ? (
        <p className="mt-10 text-ink/50" data-testid="contests-empty">
          {t("empty")}
        </p>
      ) : (
        <div className="mt-8 space-y-5">
          {contests.map((c) => {
            const title = currentLocale === "en" ? c.titleEn : c.titleRo;
            const desc = currentLocale === "en" ? c.descEn : c.descRo;
            return (
              <Link
                key={c.id}
                href={`/contests/${c.slug}`}
                data-testid="contest-card"
                className="card-hover block rounded-2xl border border-ink/10 bg-white p-6"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                      STATUS_STYLE[c.status] ?? "bg-ink/10"
                    }`}
                  >
                    {t(`status${c.status}` as "statusUPCOMING")}
                  </span>
                  <span className="text-sm text-ink/50">
                    {t("period")}: {fmt(c.startsAt)} – {fmt(c.endsAt)}
                  </span>
                </div>
                <h2 className="font-display mt-3 text-2xl font-bold">{title}</h2>
                {desc && <p className="mt-2 line-clamp-2 text-ink/70">{desc}</p>}
                {c._count.auctions > 0 && (
                  <p className="mt-3 text-sm font-semibold text-wing-blue">
                    {c._count.auctions} × {t("lots").toLowerCase()}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
