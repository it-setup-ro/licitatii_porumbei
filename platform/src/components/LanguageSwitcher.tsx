"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";

export default function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  const switchTo = (next: string) => {
    if (next !== locale) router.replace(pathname, { locale: next });
  };

  return (
    <div
      className="flex items-center gap-1 text-sm font-medium"
      role="group"
      aria-label="Language"
    >
      {["ro", "en"].map((l) => (
        <button
          key={l}
          onClick={() => switchTo(l)}
          data-testid={`lang-${l}`}
          className={`px-2 py-1 rounded uppercase transition-colors ${
            l === locale
              ? "bg-ink text-ivory"
              : "text-ink/60 hover:text-ink hover:bg-ink/5"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
