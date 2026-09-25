import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { breederOfCurrentUser } from "@/lib/breeder-access";
import BreederNav from "@/components/BreederNav";
import BreederProfileForm from "@/components/BreederProfileForm";

export const dynamic = "force-dynamic";

/**
 * Fișa mea — ce se vede despre crescător pe site: poza, localitatea, povestea
 * și rezultatele. Plus aliasul contului. Numele rămâne al administratorului:
 * de el atârnă titlurile licitațiilor și tot ce s-a vândut până acum.
 */
export default async function BreederProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("breeder");

  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale });
  const acces = await breederOfCurrentUser();
  if (!acces) redirect({ href: "/account", locale });
  const { breeder } = acces!;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="font-display mb-2 text-3xl font-bold">{t("myProfile")}</h1>
      <p className="mb-6 text-sm text-ink/60">{t("profileIntro")}</p>
      <BreederNav active="profile" />

      <div className="mt-6 rounded-2xl border border-ink/10 bg-white p-6">
        <p className="text-sm">
          <span className="text-ink/50">{t("nameLabel")}: </span>
          <span className="font-semibold" data-testid="breeder-name">
            {breeder.name}
          </span>
        </p>
        <p className="mt-1 text-xs text-ink/50">{t("nameFixed")}</p>
      </div>

      <BreederProfileForm
        initial={{
          alias: acces!.user.nickname ?? "",
          city: breeder.city ?? "",
          country: breeder.country ?? "",
          photoUrl: breeder.photoUrl ?? "",
          storyRo: breeder.storyRo ?? "",
          storyEn: breeder.storyEn ?? "",
          resultsRo: breeder.resultsRo ?? "",
          resultsEn: breeder.resultsEn ?? "",
        }}
      />
    </div>
  );
}
