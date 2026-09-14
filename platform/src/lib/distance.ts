/**
 * Distanța unui concurs: un număr („200") sau un interval („170-240").
 *
 * Crescătorii aceluiași concurs nu pleacă din același loc, deci nu au aceeași
 * distanță până la lansare. Organizatorul scrie intervalul într-un singur
 * câmp, cum l-ar scrie pe hârtie; în baza de date rămân două numere, ca să se
 * poată formata („1.000–1.200 KM") și, mai târziu, filtra.
 */

export type DistanceRange = { min: number; max: number | null };

const MAX_KM = 20_000;

/**
 * „200" -> {200, null} · „170-240 km" -> {170, 240} · „" -> null.
 * Ce nu se poate citi întoarce "INVALID", ca formularul să spună ce e greșit.
 */
export function parseDistance(input: string): DistanceRange | null | "INVALID" {
  const text = input.trim().toLowerCase().replace(/km$/, "").trim();
  if (text === "") return null;

  // punctul și spațiul sunt separatoare de mii: „1.000" = 1000
  const compact = text.replace(/[.\s]/g, "");
  const match = compact.match(/^(\d+)(?:[-–—](\d+))?$/);
  if (!match) return "INVALID";

  let min = Number(match[1]);
  let max = match[2] !== undefined ? Number(match[2]) : null;

  // „240-170" e tot un interval; nu-l refuzăm pentru ordine
  if (max !== null && max < min) [min, max] = [max, min];

  if (min <= 0 || min > MAX_KM || (max !== null && max > MAX_KM)) return "INVALID";
  if (max === min) max = null;
  return { min, max };
}

/** Pentru afișare: „1.000–1.200" sau „200", cu separatorul de mii al limbii. */
export function formatDistance(min: number, max: number | null, locale: string): string {
  const nf = new Intl.NumberFormat(locale);
  return max !== null && max !== min ? `${nf.format(min)}–${nf.format(max)}` : nf.format(min);
}

/** Pentru câmpul din formular: „170-240", „200" sau gol. */
export function distanceToInput(min: number | null, max: number | null): string {
  if (min === null) return "";
  return max !== null && max !== min ? `${min}-${max}` : String(min);
}
