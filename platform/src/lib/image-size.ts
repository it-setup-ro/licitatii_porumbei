/**
 * Cât de mare rămâne o poză după micșorarea din browser.
 *
 * Fotografiile de pe telefon au 4000–8000 px și 3–12 MB. Pe site o poză se vede
 * cel mult pe lățimea ecranului, iar la mărire pe un monitor mare, deci 2560 px
 * pe latura lungă ajung. Proporțiile rămân aceleași; o poză deja mică nu se mărește.
 */

export const MAX_IMAGE_SIDE = 2560;

/** Peste acest prag o poză se recomprimă chiar dacă are deja dimensiuni potrivite. */
export const RECOMPRESS_OVER_BYTES = 2.5 * 1024 * 1024;

export function targetImageSize(
  width: number,
  height: number,
  maxSide = MAX_IMAGE_SIDE
): { width: number; height: number; resized: boolean } {
  if (!(width > 0) || !(height > 0)) return { width, height, resized: false };
  const scale = Math.min(1, maxSide / Math.max(width, height));
  if (scale >= 1) return { width, height, resized: false };
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    resized: true,
  };
}
