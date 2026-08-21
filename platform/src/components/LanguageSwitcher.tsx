"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";

/** `variant="dark"` pentru bara de sus (fundal negru), implicit pentru header. */
export default function LanguageSwitcher({
  variant = "light",
}: {
  variant?: "light" | "dark";
}) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  const switchTo = (next: string) => {
    if (next !== locale) router.replace(pathname, { locale: next });
  };

  const dark = variant === "dark";

  return (
    <div
      className={`flex items-center gap-1 font-medium ${dark ? "text-xs" : "text-sm"}`}
      role="group"
      aria-label="Language"
    >
      {["ro", "en"].map((l) => (
        <button
          key={l}
          onClick={() => switchTo(l)}
          data-testid={`lang-${l}`}
          className={`rounded px-2 py-0.5 uppercase transition-colors ${
            l === locale
              ? dark
                ? "bg-ivory text-ink"
                : "bg-ink text-ivory"
              : dark
                ? "text-ivory/60 hover:bg-ivory/10 hover:text-ivory"
                : "text-ink/60 hover:bg-ink/5 hover:text-ink"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
