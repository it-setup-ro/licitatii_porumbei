import { setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import ResetLinkButton from "@/components/admin/ResetLinkButton";

export const dynamic = "force-dynamic";

/**
 * Lista utilizatorilor, cu căutare după nume sau e-mail.
 *
 * Rostul principal: să poți genera un link de resetare pentru cineva care nu
 * primește e-mailul. Parolele nu se văd de nicăieri — sunt păstrate doar ca
 * amprentă, deci nici adminul nu le poate afla.
 */
export default async function AdminUsersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const q = (await searchParams).q?.trim() ?? "";

  const users = await prisma.user.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      sellerStatus: true,
      suspendedAt: true,
      createdAt: true,
    },
  });

  return (
    <div>
      <h1 className="font-display mb-2 text-2xl font-bold sm:text-3xl">Utilizatori</h1>
      <p className="mb-6 text-sm text-ink/60">
        Cel mult 50 de rezultate, cele mai noi întâi. Butonul „Link de resetare” e pentru cazul în
        care cineva nu primește e-mailul — îi dai linkul direct.
      </p>

      <form className="mb-6 flex gap-2" data-testid="users-search-form">
        <input
          name="q"
          defaultValue={q}
          placeholder="Caută după nume sau e-mail"
          data-testid="users-search"
          className="min-w-0 flex-1 rounded-xl border border-ink/20 bg-ivory-soft px-4 py-2.5 text-sm outline-none focus:border-wing-blue"
        />
        <button
          type="submit"
          className="rounded-xl bg-ink px-5 py-2.5 text-sm font-bold text-ivory hover:bg-wing-orange"
        >
          Caută
        </button>
      </form>

      {users.length === 0 ? (
        <p className="text-ink/50" data-testid="users-empty">
          Niciun utilizator găsit.
        </p>
      ) : (
        <div className="space-y-3" data-testid="users-list">
          {users.map((u) => (
            <div
              key={u.id}
              data-testid="user-row"
              className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-ink/10 bg-white p-5"
            >
              <div className="min-w-0 text-sm">
                <p className="font-display text-base font-bold">
                  {u.name}
                  {u.role === "ADMIN" && (
                    <span className="ml-2 rounded bg-wing-blue/10 px-2 py-0.5 text-xs font-bold text-wing-blue">
                      admin
                    </span>
                  )}
                  {u.suspendedAt && (
                    <span className="ml-2 rounded bg-wing-red/10 px-2 py-0.5 text-xs font-bold text-wing-red">
                      suspendat
                    </span>
                  )}
                </p>
                <p className="truncate text-ink/60">
                  {u.email}
                  {u.sellerStatus ? ` · vânzător: ${u.sellerStatus}` : ""}
                </p>
              </div>
              <ResetLinkButton userId={u.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
