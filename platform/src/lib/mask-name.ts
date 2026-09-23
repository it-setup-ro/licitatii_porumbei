/**
 * Numele public al unui ofertant, intr-un singur loc: la fel pe pagina randata
 * de server si pe randul care vine live, altfel acelasi om aparea cu doua nume.
 */

/** Confidentialitate: numele ofertantilor apar mascate public (M. P***). */
export function maskName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  return parts
    .map((p, i) => (i === 0 ? `${p[0]}.` : `${p.slice(0, 1)}***`))
    .join(" ");
}

/** Porecla, daca omul si-a pus una; altfel numele mascat. */
export function publicBidderName(nickname: string | null, name: string): string {
  return nickname ?? maskName(name);
}
