"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { LOCALE_INFO, SELECTOR_ORDER } from "@/lib/locales";

/**
 * Alegerea limbii — o listă cu numele fiecărei limbi scris în limba ei, ca
 * oricine să o recunoască pe a lui (English, 中文, العربية…).
 *
 * `variant="dark"` pentru bara de sus (fundal negru), implicit pentru header.
 */
export default function LanguageSwitcher({
  variant = "light",
}: {
  variant?: "light" | "dark";
}) {
  const t = useTranslations("common");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const dark = variant === "dark";

  return (
    <label className="flex items-center gap-1.5">
      <span className="sr-only">{t("language")}</span>
      <span aria-hidden="true" className={dark ? "text-ivory/70" : "text-ink/60"}>
        🌐
      </span>
      <select
        value={locale}
        onChange={(e) => {
          if (e.target.value !== locale) router.replace(pathname, { locale: e.target.value });
        }}
        data-testid="lang-select"
        className={`rounded px-2 py-1.5 font-medium outline-none focus:ring-2 focus:ring-wing-blue ${
          dark
            ? "border border-ivory/20 bg-ink text-xs text-ivory hover:border-ivory/50"
            : "border border-ink/15 bg-white text-sm text-ink hover:border-ink/40"
        }`}
      >
        {SELECTOR_ORDER.map((l) => (
          <option key={l} value={l} lang={l} dir={LOCALE_INFO[l].dir}>
            {LOCALE_INFO[l].native}
          </option>
        ))}
      </select>
    </label>
  );
}
