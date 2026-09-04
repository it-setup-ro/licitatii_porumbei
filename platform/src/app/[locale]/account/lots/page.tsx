import { getTranslations, getLocale, setRequestLocale } from "next-intl/server";
import { redirect, Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import AccountNav from "@/components/AccountNav";
import { editScope } from "@/lib/lot-editing";

export const dynamic = "force-dynamic";

export default async function MyLotsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("account");
  const ta = await getTranslations("auction");
  const currentLocale = await getLocale();
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale });

  const auctions = await prisma.auction.findMany({
    where: { sellerId: user!.id },
    include: { pigeon: true, _count: { select: { bids: true } } },
    orderBy: { createdAt: "desc" },
  });

  const statusLabel = (s: string) =>
    s === "LIVE"
      ? ta("statusLive")
      : s === "SCHEDULED"
        ? ta("statusScheduled")
        : s === "CLOSED"
          ? ta("statusClosed")
          : s;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="font-display mb-6 text-3xl font-bold">{t("myLots")}</h1>
      <AccountNav active="lots" />
      <div className="mt-6 space-y-3" data-testid="my-lots">
        {auctions.map((a) => (
          <div
            key={a.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink/10 bg-white p-4"
            data-testid="my-lot-row"
          >
            <div>
              <Link
                href={`/auctions/${a.id}`}
                className="font-display font-bold hover:text-wing-blue"
              >
                {a.pigeon.name}
              </Link>
              <p className="text-sm text-ink/60">
                {a._count.bids > 0
                  ? formatMoney(a.currentPriceCents, a.currency, currentLocale)
                  : formatMoney(a.startPriceCents, a.currency, currentLocale)}{" "}
                · {ta("bidsCount", { count: a._count.bids })}
              </p>
              {a.status === "REJECTED" && a.rejectReason && (
                <p className="text-xs text-wing-red">{a.rejectReason}</p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-3">
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                a.status === "LIVE"
                  ? "bg-wing-red text-white"
                  : a.status === "PENDING_APPROVAL"
                    ? "bg-wing-orange/15 text-wing-orange"
                    : a.status === "REJECTED"
                      ? "bg-wing-red/10 text-wing-red"
                      : "bg-ink/5"
              }`}
              data-testid="lot-status"
            >
              {a.status === "PENDING_APPROVAL" ? "⏳" : ""} {statusLabel(a.status)}
            </span>
            {editScope({ status: a.status, bidCount: a._count.bids }, false) !== "NONE" && (
              <Link
                href={`/account/lots/${a.id}/edit`}
                data-testid="my-lot-edit"
                className="rounded-lg border border-ink/20 px-4 py-2.5 text-sm font-semibold hover:border-wing-blue hover:text-wing-blue"
              >
                {t("editLot")}
              </Link>
            )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
