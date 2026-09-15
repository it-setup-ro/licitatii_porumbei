import { describe, it, expect } from "vitest";
import { targetImageSize } from "../../src/lib/image-size";

describe("micșorarea pozelor înainte de urcare", () => {
  it("o poză de telefon ajunge la 2560 px pe latura lungă, cu aceleași proporții", () => {
    expect(targetImageSize(4000, 3000)).toEqual({ width: 2560, height: 1920, resized: true });
    expect(targetImageSize(3024, 4032)).toEqual({ width: 1920, height: 2560, resized: true });
  });

  it("o poză deja mică rămâne cum e", () => {
    expect(targetImageSize(1200, 800)).toEqual({ width: 1200, height: 800, resized: false });
    expect(targetImageSize(2560, 1440)).toEqual({ width: 2560, height: 1440, resized: false });
  });

  it("dimensiuni necunoscute nu se ating", () => {
    expect(targetImageSize(0, 0)).toEqual({ width: 0, height: 0, resized: false });
  });
});
