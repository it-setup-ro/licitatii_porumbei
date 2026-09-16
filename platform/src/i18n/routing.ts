import { defineRouting } from "next-intl/routing";
import { DEFAULT_LOCALE, LOCALES } from "@/lib/locales";

/**
 * Cele 13 limbi ale site-ului. La prima vizită, limba se ia din browser dacă e
 * una dintre ele; altfel română.
 */
export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: "always",
});
