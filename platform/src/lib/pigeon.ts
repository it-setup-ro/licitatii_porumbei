/**
 * Mărunțișuri despre porumbel, folosite în mai multe locuri.
 */

/** Semnele cerute de client: ♂ mascul, ♀ femelă; puiul / nedeterminatul nu are semn. */
export const SEX_SYMBOL: Record<string, string> = { M: "♂", F: "♀", U: "" };

/**
 * Anul, din seria inelului. Clientul: „scoate anul, e suficient inelul" — seria
 * îl conține deja (RO 2025 123456). Anul rămâne în bază pentru sortări și
 * rapoarte, dar nu se mai cere și nu se mai afișează.
 */
export function yearFromRing(ring: string, now = new Date()): number {
  const four = ring.match(/(?:^|\D)((?:19|20)\d{2})(?:\D|$)/);
  if (four) return Number(four[1]);
  // „BE 23 1234567" — anul pe două cifre, după codul țării
  const two = ring.match(/^[A-Za-z]{1,4}[\s-]*(\d{2})[\s-]+\d/);
  if (two) {
    const y = 2000 + Number(two[1]);
    return y > now.getFullYear() + 1 ? y - 100 : y;
  }
  return now.getFullYear();
}
