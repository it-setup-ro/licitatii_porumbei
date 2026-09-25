/**
 * Contul de crescător.
 *
 * Până acum crescătorii nu aveau cont: trimiteau datele pe e-mail, iar
 * administratorul le punea în site. Acum fișa unui crescător poate fi legată de
 * un cont, ca omul să-și vadă singur licitațiile, vânzările și decontul, și
 * să-și țină la zi propria fișă. Nu capătă drepturi de administrare: totul se
 * uită prin fișa lui (`Breeder.userId`), niciodată prin rol.
 */

import { prisma } from "./db";
import { AuthError, getCurrentUser, requireUser } from "./auth";

/** Fișa de crescător a contului curent, dacă are una. Fără cont: null. */
export async function breederOfCurrentUser() {
  const user = await getCurrentUser();
  if (!user || user.suspendedAt) return null;
  const breeder = await prisma.breeder.findUnique({ where: { userId: user.id } });
  return breeder ? { user, breeder } : null;
}

/** Pentru paginile și rutele crescătorului: fără fișă legată, nu intră. */
export async function requireBreeder() {
  const user = await requireUser();
  const breeder = await prisma.breeder.findUnique({ where: { userId: user.id } });
  if (!breeder) throw new AuthError("FORBIDDEN");
  return { user, breeder };
}
