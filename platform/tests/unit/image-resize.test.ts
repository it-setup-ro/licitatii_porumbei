import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { pregatestePoza } from "../../src/lib/image-resize";
import { MAX_IMAGE_SIDE } from "../../src/lib/image-size";

/**
 * Micșorarea pozelor la încărcare. Clientul a urcat un fundal de 2,3 MB, iar
 * pagina se încărca greu pe telefon.
 */

async function poza(latime: number, inaltime: number, format: "png" | "jpeg", alpha = false) {
  const canal = alpha ? 4 : 3;
  const img = sharp({
    create: {
      width: latime,
      height: inaltime,
      channels: canal as 3 | 4,
      background: alpha ? { r: 200, g: 90, b: 40, alpha: 0.5 } : { r: 200, g: 90, b: 40 },
      noise: { type: "gaussian", mean: 128, sigma: 30 },
    },
  });
  return format === "png" ? img.png().toBuffer() : img.jpeg().toBuffer();
}

describe("pregatestePoza", () => {
  it("micșorează o fotografie lată și o trece în JPEG", async () => {
    const mare = await poza(3200, 2000, "png");
    const gata = await pregatestePoza(mare, "image/png");

    expect(gata.schimbata).toBe(true);
    expect(gata.tip).toBe("image/jpeg");
    const meta = await sharp(gata.buf).metadata();
    expect(meta.width).toBe(MAX_IMAGE_SIDE);
    expect(gata.buf.length).toBeLessThan(mare.length);
  });

  it("o poză cu transparență rămâne PNG", async () => {
    const siglă = await poza(3000, 1000, "png", true);
    const gata = await pregatestePoza(siglă, "image/png");

    expect(gata.tip).toBe("image/png");
    const meta = await sharp(gata.buf).metadata();
    expect(meta.width).toBe(MAX_IMAGE_SIDE);
    expect(meta.hasAlpha).toBe(true);
  });

  it("o poză mică și deja strânsă rămâne neatinsă", async () => {
    const mica = await poza(600, 400, "jpeg");
    const gata = await pregatestePoza(mica, "image/jpeg");

    // fie o lasă exact cum era, fie iese mai mică — niciodată mai mare
    expect(gata.buf.length).toBeLessThanOrEqual(mica.length);
    const meta = await sharp(gata.buf).metadata();
    expect(meta.width).toBe(600);
  });

  it("un fișier care nu e poză se întoarce neatins, fără să arunce", async () => {
    const gunoi = Buffer.from("nu sunt o poză");
    const gata = await pregatestePoza(gunoi, "image/png");
    expect(gata.schimbata).toBe(false);
    expect(gata.buf).toBe(gunoi);
  });
});
