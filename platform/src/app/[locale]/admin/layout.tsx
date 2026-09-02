import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import AdminNav from "@/components/admin/AdminNav";

export const dynamic = "force-dynamic";

/**
 * Cadrul administrării: navigația într-o parte, conținutul în cealaltă.
 *
 * Numerele de lângă intrările de moderare se citesc aici, o singură dată
 * pentru toate paginile — altfel adminul trebuie să intre în fiecare secțiune
 * ca să afle dacă are ceva de făcut acolo.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect({ href: "/", locale });

  const [sellers, lots, reviews, messages] = await Promise.all([
    prisma.user.count({ where: { sellerStatus: "PENDING" } }),
    prisma.auction.count({ where: { status: "PENDING_APPROVAL" } }),
    prisma.review.count({ where: { reportedAt: { not: null }, moderNote: null } }),
    prisma.contactMessage.count({ where: { handledAt: null } }),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 lg:py-10">
      <div className="lg:grid lg:grid-cols-[224px_1fr] lg:gap-10">
        <AdminNav counts={{ sellers, lots, reviews, messages }} />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
