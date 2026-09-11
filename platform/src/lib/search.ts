/**
 * Cautarea de porumbei.
 *
 * Un om care cauta „cuca lui nita" trebuie sa gaseasca „CUCA lui NIȚĂ". Baza
 * de date compara insa exact: alta majuscula, alt caracter; iar „ț" si „t"
 * sunt litere diferite. De aceea normalizam amandoua partile — si ce scrie
 * omul, si ce e in baza — la litere mici fara diacritice.
 *
 * Partea din baza se face cu `translate()` din Postgres, ca sa nu avem nevoie
 * de extensia `unaccent` (care cere drepturi de superutilizator la instalare).
 * Lista acopera romana, plus diacriticele vecine care apar la nume de linii
 * si crescatorii straini (Janssen, Vandenabeele, Hérbots…).
 */

/** Perechea pentru `translate(text, FROM, TO)` — aceleasi litere, in aceeasi ordine. */
export const DIACRITICE_DIN = "ăâîșțĂÂÎȘȚşţŞŢáàäâéèëêíìïîóòöôúùüûçñÁÀÄÉÈËÍÌÏÓÒÖÚÙÜÇÑ";
export const DIACRITICE_IN = "aaistAAISTstSTaaaaeeeeiiiioooouuuucnAAAEEEIIIOOOUUUCN";

/** „CUCA lui NIȚĂ " -> „cuca lui nita" */
export function normalizeSearch(text: string): string {
  const din = [...DIACRITICE_DIN];
  const catre = [...DIACRITICE_IN];
  return [...text.trim().toLowerCase()]
    .map((ch) => {
      const i = din.indexOf(ch);
      return i === -1 ? ch : catre[i];
    })
    .join("")
    .toLowerCase();
}
