import FxRateCard from "@/components/admin/FxRateCard";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getSettings } from "@/lib/settings";
import SettingsForm from "@/components/admin/SettingsForm";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const settings = await getSettings();

  return (
    <div>
      <h1 className="font-display mb-8 text-3xl font-bold">{t("settings")}</h1>
      <FxRateCard
        mode={settings.fxMode}
        manualRate={settings.fxManualRate}
        bnrRate={settings.fxBnrRate}
        bnrDate={settings.fxBnrDate}
      />
      <SettingsForm initial={settings} />
    </div>
  );
}
