import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import ModerationButtons from "@/components/admin/ModerationButtons";

export const dynamic = "force-dynamic";

export default async function AdminSellersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");

  const pending = await prisma.user.findMany({
    where: { sellerStatus: "PENDING" },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <h1 className="font-display mb-8 text-3xl font-bold">{t("pendingSellers")}</h1>
      {pending.length === 0 ? (
        <p className="text-ink/50" data-testid="no-pending-sellers">
          {t("noPending")}
        </p>
      ) : (
        <div className="space-y-4">
          {pending.map((u) => (
            <div
              key={u.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-ink/10 bg-white p-5"
              data-testid="pending-seller-row"
            >
              <div className="text-sm">
                <p className="font-display text-base font-bold">{u.name}</p>
                <p className="text-ink/60">{u.email}</p>
                <p className="mt-1 text-ink/80">
                  {u.sellerCompany} · {u.sellerCui ?? "—"} · {u.sellerIban}
                </p>
              </div>
              <ModerationButtons
                endpoint={`/api/admin/sellers/${u.id}`}
                approveAction="APPROVE"
                rejectAction="REJECT"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
