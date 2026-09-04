import { getTranslations, getLocale, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { Link } from "@/i18n/navigation";
import { getSettings } from "@/lib/settings";
import ModerationButtons from "@/components/admin/ModerationButtons";
import ShortenButton from "@/components/admin/ShortenButton";

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

  const [pending, settings] = await Promise.all([
    prisma.auction.findMany({
      where: { status: "PENDING_APPROVAL" },
      include: { pigeon: { include: { seller: true } } },
      orderBy: { createdAt: "asc" },
    }),
    getSettings(),
  ]);

  // Lista de mai jos exista doar pentru unealta de test „inchide in 1 minut".
  // Cand comutatorul e stins, nici nu mai interogam.
  const running = settings.testShortenEnabled
    ? await prisma.auction.findMany({
        where: { status: { in: ["LIVE", "SCHEDULED"] } },
        include: { pigeon: true },
        orderBy: { endsAt: "asc" },
      })
    : [];

  const when = new Intl.DateTimeFormat(currentLocale === "ro" ? "ro-RO" : "en-GB", {
    dateStyle: "short",
    timeStyle: "short",
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
                  {a.pigeon.name}
                </p>
                <p className="text-ink/60">
                  {a.pigeon.ringNumber} · {a.pigeon.seller.name} ·{" "}
                  {formatMoney(a.startPriceCents, a.currency, currentLocale)} · {a.listingType}
                </p>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <Link
                href={`/account/lots/${a.id}/edit`}
                data-testid="admin-lot-edit"
                className="rounded-lg border border-ink/20 px-4 py-2.5 text-center text-sm font-semibold hover:border-wing-blue hover:text-wing-blue"
              >
                Editează
              </Link>
              <ModerationButtons
                endpoint={`/api/admin/lots/${a.id}`}
                approveAction="APPROVE"
                rejectAction="REJECT"
                askReason
                startNow
              />
              </div>
            </div>
          ))}
        </div>
      )}
      {settings.testShortenEnabled && (
        <section className="mt-12" data-testid="test-tools">
          <div className="mb-4 rounded-2xl border border-wing-orange/40 bg-wing-orange/5 p-4">
            <h2 className="font-display text-xl font-bold">🧪 Licitații în desfășurare — testare</h2>
            <p className="mt-1 text-sm text-ink/70">
              Butonul mută închiderea peste un minut, ca să poți verifica rapid finalul:
              anti-sniping, câștigător, notificări, comandă. Se ascunde din{" "}
              <Link
                href="/admin/settings"
                className="-my-1 inline-block py-2 font-semibold underline"
              >
                Setări → Unelte de test
              </Link>
              , când platforma intră pe public.
            </p>
          </div>

          {running.length === 0 ? (
            <p className="text-ink/50">Nicio licitație activă sau programată.</p>
          ) : (
            <div className="space-y-3">
              {running.map((a) => (
                <div
                  key={a.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-ink/10 bg-white p-5"
                  data-testid="running-lot-row"
                >
                  <div className="text-sm">
                    <p className="font-display text-base font-bold">{a.pigeon.name}</p>
                    <p className="text-ink/60">
                      {a.pigeon.ringNumber} · {a.status} · se închide {when.format(a.endsAt)}
                    </p>
                  </div>
                  <ShortenButton auctionId={a.id} />
                </div>
              ))}
            </div>
          )}
        </section>
      )}

    </div>
  );
}
