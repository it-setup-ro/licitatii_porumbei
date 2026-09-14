import { setRequestLocale } from "next-intl/server";
import { getSettings } from "@/lib/settings";
import RegisterForm from "@/components/RegisterForm";

export const dynamic = "force-dynamic";

export default async function RegisterPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const settings = await getSettings();
  return (
    <RegisterForm
      sellerSignupEnabled={settings.breederSelfServiceEnabled}
      strictSignup={settings.accountApprovalRequired}
    />
  );
}
