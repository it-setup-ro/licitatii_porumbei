/**
 * Plafoane de validare pentru datele care ajung in DB.
 * Coloanele sunt Int (Postgres, max 2.147.483.647) — fara plafoane, o valoare
 * uriasa fie sparge coloana cu eroare 500, fie creeaza comenzi fictive de
 * milioane de euro. Tinem limitele generos peste orice caz real, dar finite.
 */

/** 1.000.000 EUR in centi — peste orice porumbel vandut vreodata. */
export const MAX_MONEY_CENTS = 100_000_000;

/** Numere de clasament/participanti/distanta — orice peste asta e nonsens. */
export const MAX_COUNT = 1_000_000;

/** Dimensiunea maxima a arborelui genealogic serializat (JSON). */
export const MAX_PEDIGREE_CHARS = 8_000;

/**
 * Fisierele acceptate in continut: doar ce a fost urcat prin /api/upload sau
 * imaginile demo din repo. Blocheaza URL-uri externe (care ar functiona ca
 * pixeli de urmarire, scurgand IP-ul fiecarui vizitator catre un tert) si
 * schemele periculoase (javascript:, data:).
 *
 * Trei liste, pentru ca nu peste tot are sens acelasi set de fisiere.
 */

/** O singura poza: coperta de produs sau de concurs. */
export const SAFE_IMAGE_URL =
  /^\/(api\/files\/[a-z0-9-]+\.(jpg|png|webp)|(pigeons|products|brand)\/[a-z0-9._-]+\.(svg|jpg|jpeg|png|webp))$/i;

/** Galerie: poze si clipuri. Folosita la articole si la loturi. */
export const SAFE_GALLERY_URL =
  /^\/(api\/files\/[a-z0-9-]+\.(jpg|png|webp|mp4|webm)|(pigeons|products|brand)\/[a-z0-9._-]+\.(svg|jpg|jpeg|png|webp))$/i;

/** Scanul pedigree-ului: poza sau PDF. */
export const SAFE_PEDIGREE_URL =
  /^\/(api\/files\/[a-z0-9-]+\.(jpg|png|webp|pdf)|(pigeons|products|brand)\/[a-z0-9._-]+\.(svg|jpg|jpeg|png|webp))$/i;
