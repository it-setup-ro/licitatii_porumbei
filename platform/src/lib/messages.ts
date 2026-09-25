import { createTranslator } from "next-intl";
import { normalizeLocale, type AppLocale } from "./locales";
import ro from "../../messages/ro.json";
import en from "../../messages/en.json";
import zh from "../../messages/zh.json";
import ja from "../../messages/ja.json";
import nl from "../../messages/nl.json";
import fr from "../../messages/fr.json";
import de from "../../messages/de.json";
import es from "../../messages/es.json";
import pl from "../../messages/pl.json";
import ar from "../../messages/ar.json";
import hi from "../../messages/hi.json";
import gu from "../../messages/gu.json";
import sw from "../../messages/sw.json";

/**
 * Textele în afara unei pagini — e-mailuri, notificări, fișiere generate.
 * Acolo nu există limba cererii, ci limba contului care primește mesajul.
 *
 * Doar pe server: cele 13 fișiere ar îngreuna mult paginile din browser.
 */

export type Messages = typeof en;

const ALL = { ro, en, zh, ja, nl, fr, de, es, pl, ar, hi, gu, sw } as unknown as Record<
  AppLocale,
  Messages
>;

export function messagesFor(locale: string | null | undefined): Messages {
  return ALL[normalizeLocale(locale)];
}

/** Textul notificărilor (clopoțel și e-mail), în limba contului. */
export function notifTranslator(locale: string | null | undefined) {
  const l = normalizeLocale(locale);
  return createTranslator({ locale: l, messages: ALL[l], namespace: "notif" });
}

/** Traducătorul pentru e-mailuri, în limba contului (necunoscută → română). */
export function emailTranslator(locale: string | null | undefined) {
  const l = normalizeLocale(locale);
  return createTranslator({ locale: l, messages: ALL[l], namespace: "email" });
}
