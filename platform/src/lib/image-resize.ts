import sharp from "sharp";
import { MAX_IMAGE_SIDE, targetImageSize } from "./image-size";

/**
 * Pregătirea unei poze la încărcare: micșorare, rotire după EXIF, format potrivit.
 *
 * Clientul a urcat o fotografie de 2,3 MB ca fundal; pe telefon, cu internet
 * slab, pagina se încărca greu. Browserul micșora deja pozele mari, dar numai
 * peste 2,5 MB sau peste 2560 px — a lui trecea pe lângă amândouă. Acum trece
 * fiecare poză și prin server, ultimul cuvânt: o fotografie se ține în JPEG,
 * nu în PNG, iar ce vine prin API direct nu mai scapă nemicșorat.
 *
 * Reguli:
 *  - latura lungă peste 2560 px → se micșorează (nu se mărește niciodată);
 *    e aceeași limită ca la micșorarea din browser (`lib/image-size.ts`), ca să
 *    nu existe două adevăruri despre cât de mare rămâne o poză;
 *  - cu transparență (siglă, pedigree decupat) → rămâne PNG;
 *  - fără transparență → JPEG de calitate 82, cât vede ochiul, de câteva ori
 *    mai mic;
 *  - WebP rămâne WebP;
 *  - pozele făcute cu telefonul vin culcate, cu orientarea scrisă în EXIF:
 *    `rotate()` le îndreaptă definitiv, ca să arate la fel peste tot.
 *
 * Dacă ceva nu merge (fișier ciudat, bibliotecă indisponibilă), se păstrează
 * fișierul exact cum a venit: o poză mare e mai bună decât o poză pierdută.
 */

const CALITATE = 82;

export type PozaPregatita = {
  buf: Buffer;
  /** tipul final; se poate schimba din PNG în JPEG */
  tip: string;
  /** s-a atins ceva la ea? (pentru jurnal și teste) */
  schimbata: boolean;
};

export async function pregatestePoza(buf: Buffer, tip: string): Promise<PozaPregatita> {
  try {
    const meta = await sharp(buf).metadata();
    const tinta = targetImageSize(meta.width ?? 0, meta.height ?? 0);
    const preaMare = tinta.resized;
    const areTransparenta = meta.hasAlpha === true;

    let lucru = sharp(buf, { failOn: "none" }).rotate();
    if (preaMare) {
      lucru = lucru.resize({
        width: MAX_IMAGE_SIDE,
        height: MAX_IMAGE_SIDE,
        fit: "inside",
        withoutEnlargement: true,
      });
    }

    let tipNou = tip;
    if (tip === "image/webp") {
      lucru = lucru.webp({ quality: CALITATE });
    } else if (areTransparenta) {
      lucru = lucru.png({ compressionLevel: 9 });
      tipNou = "image/png";
    } else {
      lucru = lucru.jpeg({ quality: CALITATE, mozjpeg: true });
      tipNou = "image/jpeg";
    }

    const iesire = await lucru.toBuffer();
    // dacă „optimizarea" a ieșit mai mare și poza nici nu era prea mare, nu are
    // rost: păstrăm originalul
    if (!preaMare && iesire.length >= buf.length) return { buf, tip, schimbata: false };
    return { buf: iesire, tip: tipNou, schimbata: true };
  } catch {
    return { buf, tip, schimbata: false };
  }
}
