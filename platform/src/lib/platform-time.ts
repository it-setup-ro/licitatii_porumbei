import { intlLocale } from "./locales";

/**
 * Ora platformei.
 *
 * Toate orele de pe site sunt ora României — cea din bara de sus, după care se
 * închid licitațiile. Fără asta, aceeași ofertă se vedea la ore diferite: pe
 * server se scria în fusul serverului (cu o oră în urmă), iar în browser în
 * fusul telefonului. Clientul a licitat la 20:55 și în istoric scria 19:55.
 */
export const PLATFORM_TZ = "Europe/Bucharest";

/**
 * Formatorul de dată/oră al platformei. `locale` poate fi limba site-ului
 * („ro", „de") sau direct o etichetă Intl („ro-RO"), ca la paginile de
 * administrare, care sunt doar în română.
 */
export function platformFormat(locale: string, options: Intl.DateTimeFormatOptions) {
  const eticheta = locale.includes("-") ? locale : intlLocale(locale);
  return new Intl.DateTimeFormat(eticheta, { timeZone: PLATFORM_TZ, ...options });
}
