/**
 * Limbile site-ului.
 *
 * Clientul a cerut 13 limbi, cu alegere. Interfața (meniuri, butoane, mesaje,
 * e-mailuri) e tradusă în toate. Conținutul scris de administrator (descrieri
 * de porumbei, articole, pagini) există doar în română și engleză: în celelalte
 * limbi se arată varianta în engleză.
 */

export const LOCALES = ["ro", "en", "zh", "ja", "nl", "fr", "de", "es", "pl", "ar", "hi", "gu", "sw"] as const;

export type AppLocale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = "ro";

type LocaleInfo = {
  /** numele limbii scris în limba ei, pentru selector */
  native: string;
  /** eticheta pentru formatarea datelor și a numerelor */
  intl: string;
  dir: "ltr" | "rtl";
};

export const LOCALE_INFO: Record<AppLocale, LocaleInfo> = {
  en: { native: "English", intl: "en-GB", dir: "ltr" },
  zh: { native: "中文", intl: "zh-CN", dir: "ltr" },
  ja: { native: "日本語", intl: "ja-JP", dir: "ltr" },
  nl: { native: "Nederlands", intl: "nl-NL", dir: "ltr" },
  fr: { native: "Français", intl: "fr-FR", dir: "ltr" },
  de: { native: "Deutsch", intl: "de-DE", dir: "ltr" },
  es: { native: "Español", intl: "es-ES", dir: "ltr" },
  pl: { native: "Polski", intl: "pl-PL", dir: "ltr" },
  // cifre latine: seriile de inel și prețurile rămân ușor de comparat
  ar: { native: "العربية", intl: "ar-u-nu-latn", dir: "rtl" },
  ro: { native: "Română", intl: "ro-RO", dir: "ltr" },
  hi: { native: "हिन्दी", intl: "hi-IN", dir: "ltr" },
  gu: { native: "ગુજરાતી", intl: "gu-IN-u-nu-latn", dir: "ltr" },
  sw: { native: "Kiswahili", intl: "sw", dir: "ltr" },
};

/** Ordinea din selector — cea din cererea clientului. */
export const SELECTOR_ORDER: AppLocale[] = ["en", "zh", "ja", "nl", "fr", "de", "es", "pl", "ar", "ro", "hi", "gu", "sw"];

export function isLocale(value: unknown): value is AppLocale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function normalizeLocale(value: unknown): AppLocale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export function intlLocale(locale: string): string {
  return isLocale(locale) ? LOCALE_INFO[locale].intl : "en-GB";
}

export function localeDir(locale: string): "ltr" | "rtl" {
  return isLocale(locale) ? LOCALE_INFO[locale].dir : "ltr";
}

/** Limba conținutului scris de administrator: română pentru română, altfel engleză. */
export function contentLang(locale: string): "ro" | "en" {
  return locale === "ro" ? "ro" : "en";
}

/**
 * Textul scris de administrator în limba vizitatorului: română în română,
 * engleză în rest; dacă varianta în engleză lipsește, rămâne cea în română.
 */
export function pick<T extends string | null | undefined>(locale: string, ro: T, en: T): T {
  if (locale === "ro") return ro;
  return en && String(en).trim() ? en : ro;
}
