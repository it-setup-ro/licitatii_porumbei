import { getTranslations, getLocale, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { Link } from "@/i18n/navigation";
import ModerationButtons from "@/components/admin/ModerationButtons";

export const dynamic = "force-dynamic";

export default async function AdminLotsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const currentLocale = await getLocale();

  const pending = await prisma.auction.findMany({
    where: { status: "PENDING_APPROVAL" },
    include: { pigeon: { include: { seller: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <h1 className="font-display mb-8 text-3xl font-bold">{t("pendingLots")}</h1>
      {pending.length === 0 ? (
        <p className="text-ink/50" data-testid="no-pending-lots">
          {t("noPending")}
        </p>
      ) : (
        <div className="space-y-4">
          {pending.map((a) => (
            <div
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-ink/10 bg-white p-5"
              data-testid="pending-lot-row"
            >
              <div className="text-sm">
                <p className="font-display text-base font-bold">
                  {currentLocale === "en" ? a.pigeon.titleEn : a.pigeon.titleRo}
                </p>
                <p className="text-ink/60">
                  {a.pigeon.ringNumber} · {a.pigeon.seller.name} ·{" "}
                  {formatMoney(a.startPriceCents, a.currency, currentLocale)} · {a.listingType}
                </p>
              </div>
              <ModerationButtons
                endpoint={`/api/admin/lots/${a.id}`}
                approveAction="APPROVE"
                rejectAction="REJECT"
                askReason
                startNow
              />
            </div>
          ))}
        </div>
      )}
      <p className="mt-6 text-xs text-ink/50">
        <Link href="/admin" className="-ml-2 inline-block px-2 py-2 underline">
          ← {t("title")}
        </Link>
      </p>
    </div>
  );
}
