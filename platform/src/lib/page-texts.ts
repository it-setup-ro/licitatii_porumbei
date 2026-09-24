import { prisma } from "./db";
import { pick } from "./locales";

/**
 * Textele de pe paginile „așezate în pagină": titlul mare de pe prima pagină,
 * deviza, și pașii de la „Cum funcționează".
 *
 * Erau scrise în fișierele de traduceri, deci clientul nu le putea schimba
 * (cererea lui: „să poată configura administratorul pagina acasă — text, moto
 * etc."). Acum se editează din Administrare → Pagini, ca orice altă pagină de
 * conținut. Dacă nu s-a scris nimic acolo, rămân textele de pornire din
 * traduceri — așa nimic nu se golește dintr-odată.
 */

export type TextePagina = { titlu: string | null; text: string | null };

async function textePentru(slug: string, locale: string): Promise<TextePagina> {
  const p = await prisma.contentPage.findUnique({ where: { slug } });
  if (!p) return { titlu: null, text: null };
  const titlu = pick(locale, p.titleRo, p.titleEn).trim();
  const text = pick(locale, p.bodyRo, p.bodyEn).trim();
  return { titlu: titlu || null, text: text || null };
}

/** Prima pagină: titlul mare și deviza de sub el. */
export function heroTexts(locale: string) {
  return textePentru("acasa", locale);
}

/** Pagina „Cum funcționează". */
export function howItWorksTexts(locale: string) {
  return textePentru("cum-functioneaza", locale);
}
