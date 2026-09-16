import { setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import AccountReview from "@/components/admin/AccountReview";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "PENDING", label: "De aprobat" },
  { key: "REJECTED", label: "Respinse" },
  { key: "APPROVED", label: "Aprobate recent" },
] as const;

/**
 * Conturile noi, de aprobat. Omul vede licitațiile de la început, dar
 * licitează abia după aprobare.
 */
export default async function AdminAccountsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const tab = TABS.find((t) => t.key === sp.tab)?.key ?? "PENDING";

  const [users, counts, settings] = await Promise.all([
    prisma.user.findMany({
      where: {
        accountStatus: tab,
        role: { not: "ADMIN" },
        ...(tab === "APPROVED" ? { accountReviewedAt: { not: null } } : {}),
      },
      orderBy: tab === "APPROVED" ? { accountReviewedAt: "desc" } : { createdAt: "desc" },
      take: 100,
    }),
    prisma.user.groupBy({
      by: ["accountStatus"],
      where: { role: { not: "ADMIN" } },
      _count: { _all: true },
    }),
    getSettings(),
  ]);
  const count = (k: string) => counts.find((c) => c.accountStatus === k)?._count._all ?? 0;

  const dateFmt = new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium", timeStyle: "short" });

  return (
    <div>
      <h1 className="font-display mb-2 text-3xl font-bold">Conturi</h1>
      <p className="mb-6 text-sm text-ink/60">
        Oricine își poate face cont și vedea licitațiile, dar licitează abia după ce îl aprobi.
        {!settings.accountApprovalRequired && (
          <strong className="ms-1 text-wing-orange">
            Aprobarea e oprită din Setări: deocamdată toate conturile pot licita.
          </strong>
        )}
      </p>

      <nav className="mb-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <a
            key={t.key}
            href={`?tab=${t.key}`}
            data-testid={`accounts-tab-${t.key.toLowerCase()}`}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
              tab === t.key ? "bg-ink text-ivory" : "border border-ink/15 bg-white hover:border-ink/40"
            }`}
          >
            {t.label}
            {t.key !== "APPROVED" && ` (${count(t.key)})`}
          </a>
        ))}
      </nav>

      {users.length === 0 ? (
        <p className="text-ink/50" data-testid="accounts-empty">
          {tab === "PENDING" ? "Niciun cont nu așteaptă aprobarea." : "Niciun cont aici."}
        </p>
      ) : (
        <div className="space-y-3">
          {users.map((u) => {
            const adresa = [u.addressStreet, u.addressCity, u.addressCounty, u.addressPostalCode, u.addressCountry]
              .filter(Boolean)
              .join(", ");
            return (
              <div
                key={u.id}
                data-testid="account-row"
                className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-ink/10 bg-white p-5"
              >
                <div className="min-w-0 text-sm">
                  <p className="font-display text-base font-bold">
                    {u.name}
                    {u.nickname && (
                      <span className="ms-2 font-body text-sm font-normal text-ink/60">
                        utilizator: <strong>{u.nickname}</strong>
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-ink/70">
                    {u.email}
                    {u.phone ? ` · ${u.phone}` : ""}
                  </p>
                  <p className="text-ink/70">{adresa || <em className="text-ink/40">fără adresă</em>}</p>
                  {u.accountType === "COMPANY" && (
                    <p className="mt-1 text-ink/70" data-testid="account-company">
                      Persoană juridică: <strong>{u.companyName}</strong> · CUI {u.companyCui} · Reg. Com.{" "}
                      {u.companyRegCom} · sediu: {u.companyAddress}
                      {u.companyBank ? ` · ${u.companyBank}` : ""}
                      {u.companyIban ? ` · ${u.companyIban}` : ""}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-ink/40">
                    cont făcut {dateFmt.format(u.createdAt)}
                    {u.accountRejectReason ? ` · motiv respingere: ${u.accountRejectReason}` : ""}
                  </p>
                </div>
                <AccountReview userId={u.id} status={u.accountStatus} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
