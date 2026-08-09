import { getTranslations, getLocale, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const currentLocale = await getLocale();

  const logs = await prisma.auditLog.findMany({
    include: { actor: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <h1 className="font-display mb-8 text-3xl font-bold">{t("audit")}</h1>
      <div className="overflow-hidden rounded-2xl border border-ink/10 bg-white">
        <table className="w-full text-sm" data-testid="audit-table">
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-b border-ink/5 last:border-0">
                <td className="px-4 py-2.5 text-ink/50">
                  {new Intl.DateTimeFormat(currentLocale === "ro" ? "ro-RO" : "en-GB", {
                    dateStyle: "short",
                    timeStyle: "medium",
                  }).format(l.createdAt)}
                </td>
                <td className="px-4 py-2.5 font-semibold">{l.action}</td>
                <td className="px-4 py-2.5">{l.actor?.name ?? "system"}</td>
                <td className="px-4 py-2.5 text-ink/60">
                  {l.entity} {l.entityId ? `#${l.entityId.slice(0, 8)}` : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
