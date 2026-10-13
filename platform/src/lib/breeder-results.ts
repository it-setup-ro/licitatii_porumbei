/**
 * „Rezultate importante" ale crescătorului, aliniate pe trei coloane.
 *
 * Clientul vrea lista din machetă: locul, cursa și anul, fiecare în coloana lui,
 * cu cupă în față. Ca să nu cerem un tabel nou în administrare, rândurile se
 * scriu tot într-o casetă de text, dar despărțite cu bară:
 *
 *     Loc 1 | Maraton – Berlin | 2025
 *
 * Un rând fără bare rămâne cum e scris — vechile rezultate nu se pierd și nu
 * cer mutare.
 *
 * Pur: se poate verifica fără bază de date.
 */

export type BreederResult = {
  /** „Loc 1" — poate lipsi */
  place: string | null;
  /** „Maraton – Berlin" sau tot rândul, dacă n-are bare */
  race: string;
  /** „2025" — poate lipsi */
  year: string | null;
};

/** Anul se recunoaște singur la finalul rândului: „… Berlin 2025". */
const AN_LA_FINAL = /\s(19|20)\d{2}\s*$/;

export function parseBreederResults(text: string | null | undefined): BreederResult[] {
  if (!text) return [];
  const randuri = text
    .split(/\r?\n/)
    .map((r) => r.trim())
    .filter((r) => r.length > 0);

  return randuri.map((rand) => {
    const bucati = rand.split("|").map((b) => b.trim());
    if (bucati.length >= 3) {
      return { place: bucati[0] || null, race: bucati[1], year: bucati[2] || null };
    }
    if (bucati.length === 2) {
      return { place: bucati[0] || null, race: bucati[1], year: null };
    }
    // fără bare: încercăm măcar anul de la sfârșit, ca să stea în coloana lui
    const an = rand.match(AN_LA_FINAL);
    if (an) {
      return { place: null, race: rand.slice(0, an.index).trim(), year: an[0].trim() };
    }
    return { place: null, race: rand, year: null };
  });
}
