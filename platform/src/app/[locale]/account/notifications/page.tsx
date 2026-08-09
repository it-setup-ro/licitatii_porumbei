import { getTranslations, getLocale, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import AccountNav from "@/components/AccountNav";
import MarkAllReadButton from "@/components/MarkAllReadButton";

export const dynamic = "force-dynamic";

export default async function NotificationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("account");
  const tn = await getTranslations("notif");
  const currentLocale = await getLocale();
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale });

  const notifications = await prisma.notification.findMany({
    where: { userId: user!.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const render = (type: string, paramsJson: string) => {
    let p: Record<string, string | number> = {};
    try {
      p = JSON.parse(paramsJson);
    } catch {
      // parametri corupti — afisam fara
    }
    const values: Record<string, string | number> = { ...p };
    if (typeof p.priceCents === "number")
      values.price = formatMoney(p.priceCents, "EUR", currentLocale);
    if (typeof p.amountCents === "number")
      values.price = formatMoney(p.amountCents, "EUR", currentLocale);
    values.lot = String(p.lot ?? "");
    values.reason = String(p.reason ?? "");
    values.rating = p.rating ?? "";
    try {
      return tn(type as "OUTBID", values as Record<string, string>);
    } catch {
      return type;
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold">{t("notifications")}</h1>
        <MarkAllReadButton />
      </div>
      <AccountNav active="notifications" />
      {notifications.length === 0 ? (
        <p className="mt-10 text-ink/50">{t("noNotifications")}</p>
      ) : (
        <div className="mt-6 space-y-2" data-testid="notifications-list">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`rounded-xl border p-4 text-sm ${
                n.readAt ? "border-ink/10 bg-white" : "border-wing-blue/30 bg-wing-blue/5"
              }`}
              data-testid={`notif-${n.type.toLowerCase()}`}
            >
              <p className="font-medium">{render(n.type, n.paramsJson)}</p>
              <p className="mt-1 text-xs text-ink/50">
                {new Intl.DateTimeFormat(currentLocale === "ro" ? "ro-RO" : "en-GB", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(n.createdAt)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
