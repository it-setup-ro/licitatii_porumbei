import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import SellerRequestForm from "@/components/SellerRequestForm";
import SellerProfileForm from "@/components/SellerProfileForm";
import AccountNav from "@/components/AccountNav";
import ChangePasswordForm from "@/components/ChangePasswordForm";
import ProfileForm from "@/components/ProfileForm";

export const dynamic = "force-dynamic";

export default async function AccountPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("account");
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale });
  const settings = await getSettings();

  const statusLabel =
    user!.role === "ADMIN" || user!.accountStatus === "APPROVED"
      ? t("statusApproved")
      : user!.accountStatus === "REJECTED"
        ? t("statusRejected")
        : t("statusPending");

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="font-display mb-6 text-3xl font-bold">{t("title")}</h1>
      <AccountNav active="profile" />

      <div className="mt-6 space-y-6">
        <div className="rounded-2xl border border-ink/10 bg-white p-6">
          <h2 className="font-display text-xl font-bold">{t("profile")}</h2>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-ink/50">Nume / Name</dt>
              <dd className="font-semibold" data-testid="profile-name">
                {user!.name}
              </dd>
            </div>
            <div>
              <dt className="text-ink/50">E-mail</dt>
              <dd className="font-semibold">{user!.email}</dd>
            </div>
            {user!.nickname && (
              <div>
                <dt className="text-ink/50">{t("nicknameLabel")}</dt>
                <dd className="font-semibold">{user!.nickname}</dd>
              </div>
            )}
            {settings.accountApprovalRequired && (
              <div>
                <dt className="text-ink/50">{t("statusLabel")}</dt>
                <dd className="font-semibold" data-testid="profile-account-status">
                  {statusLabel}
                </dd>
              </div>
            )}
          </dl>
        </div>

        <ProfileForm
          initial={{
            phone: user!.phone ?? "",
            addressStreet: user!.addressStreet ?? "",
            addressCity: user!.addressCity ?? "",
            addressCounty: user!.addressCounty ?? "",
            addressPostalCode: user!.addressPostalCode ?? "",
            addressCountry: user!.addressCountry ?? "România",
            notifyAuctionEnding: user!.notifyAuctionEnding,
          }}
        />

        <ChangePasswordForm />

        {/* Statutul de vânzător — doar cât fluxul crescătorilor e pornit din Setări */}
        {settings.breederSelfServiceEnabled && (
          <div className="rounded-2xl border border-ink/10 bg-white p-6" data-testid="seller-status">
            {user!.role === "ADMIN" ? (
              <p className="font-semibold text-wing-blue" data-testid="seller-admin-note">
                {t("adminCanSell")}
              </p>
            ) : user!.sellerStatus === "APPROVED" ? (
              <>
                <p className="font-semibold text-green-700">✓ {t("sellerApproved")}</p>
                <SellerProfileForm
                  initial={{
                    sellerCompany: user!.sellerCompany ?? "",
                    sellerCity: user!.sellerCity ?? "",
                    sellerBio: user!.sellerBio ?? "",
                  }}
                />
              </>
            ) : user!.sellerStatus === "PENDING" ? (
              <p className="font-semibold text-wing-orange" data-testid="seller-pending">
                ⏳ {t("sellerPending")}
              </p>
            ) : user!.sellerStatus === "REJECTED" ? (
              <p className="font-semibold text-wing-red">{t("sellerRejected")}</p>
            ) : (
              <SellerRequestForm />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
