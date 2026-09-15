import { setRequestLocale } from "next-intl/server";
import { getSettings } from "@/lib/settings";
import { captchaDisabled } from "@/lib/captcha";
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
      // bifa „Nu sunt robot" cere HTTPS; pe serverul fără certificat e oprită
      captchaEnabled={!captchaDisabled()}
    />
  );
}
