import { getEurRate } from "@/lib/fx";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import SellForm from "@/components/SellForm";

export const dynamic = "force-dynamic";

export default async function SellPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("sell");
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale });

  const settings = await getSettings();
  const isApproved = user!.role === "ADMIN" || user!.sellerStatus === "APPROVED";

  // Clientul: porumbeii îi pun doar administratorii (din Licitații pe loturi).
  if (!settings.breederSelfServiceEnabled && user!.role !== "ADMIN") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="font-display mb-6 text-3xl font-bold">{t("title")}</h1>
        <p
          className="rounded-2xl border border-wing-blue/30 bg-wing-blue/5 p-5 text-sm"
          data-testid="sell-closed"
        >
          {t("closedForBreeders")}
        </p>
      </div>
    );
  }

  const eurRate = await getEurRate();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-display mb-6 text-3xl font-bold">{t("title")}</h1>
      {!isApproved ? (
        <p className="rounded-2xl border border-wing-orange/40 bg-wing-orange/10 p-5 text-sm">
          {t("notApproved")}
        </p>
      ) : (
        <SellForm
          currency={settings.platformCurrency}
          minStartCents={settings.minStartPriceCents}
          commissionPercent={settings.commissionPercent}
          assistedPercent={settings.commissionPercent + settings.assistedExtraPercent}
          assistedEnabled={settings.assistedListingEnabled}
          durationDays={settings.defaultDurationDays}
          defaultOfferedBy={user!.sellerCompany ?? user!.name}
          reserveEnabled={settings.reservePriceEnabled}
          isAdmin={user!.role === "ADMIN"}
          eurRate={eurRate}
        />
      )}
    </div>
  );
}
