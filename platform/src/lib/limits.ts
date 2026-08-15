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
 * Pozele acceptate pe un lot: doar fisiere urcate prin /api/upload sau
 * imaginile demo din /pigeons/. Blocheaza URL-uri externe (pixeli de urmarire
 * care ar scurge IP-ul vizitatorilor catre terti) si scheme periculoase.
 */
export const SAFE_MEDIA_URL = /^\/(api\/files\/[a-z0-9-]+\.(jpg|png|webp)|pigeons\/[a-z0-9._-]+\.(svg|jpg|png|webp))$/i;
