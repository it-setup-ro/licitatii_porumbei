import { setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import AdminRoleControls, { RevokeAdminButton } from "@/components/admin/AdminRoleControls";

export const dynamic = "force-dynamic";

/**
 * Administratorii platformei. Clientul lucrează cu doi, cu aceleași drepturi.
 */
export default async function AdminAdminsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [me, admins] = await Promise.all([
    getCurrentUser(),
    prisma.user.findMany({
      where: { role: "ADMIN" },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, email: true, suspendedAt: true },
    }),
  ]);

  return (
    <div>
      <h1 className="font-display mb-2 text-3xl font-bold">Administratori</h1>
      <p className="mb-6 text-sm text-ink/60">
        Toți administratorii au aceleași drepturi. Fiecare acțiune rămâne în <em>Jurnal</em>, cu
        numele celui care a făcut-o.
      </p>

      <div className="mb-8 space-y-3" data-testid="admins-list">
        {admins.map((a) => (
          <div
            key={a.id}
            data-testid="admin-row"
            className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-ink/10 bg-white p-5"
          >
            <div className="text-sm">
              <p className="font-display text-base font-bold">
                {a.name}
                {a.id === me?.id && (
                  <span className="ml-2 rounded bg-wing-blue/10 px-2 py-0.5 text-xs font-bold text-wing-blue">
                    tu
                  </span>
                )}
              </p>
              <p className="text-ink/60">{a.email}</p>
            </div>
            {a.id !== me?.id && admins.length > 1 && (
              <RevokeAdminButton userId={a.id} name={a.name} />
            )}
          </div>
        ))}
      </div>

      <AdminRoleControls />
    </div>
  );
}
