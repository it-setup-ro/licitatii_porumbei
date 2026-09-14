import { describe, it, expect } from "vitest";
import { internationalDigits, telHref, whatsappHref } from "../../src/lib/contact-links";

describe("numerele de telefon din cardurile de transportatori", () => {
  it("un număr românesc scris obișnuit primește prefixul 40", () => {
    expect(internationalDigits("0723 137 787")).toBe("40723137787");
  });

  it("un număr scris deja cu + rămâne cum e", () => {
    expect(internationalDigits("+40 723 137 787")).toBe("40723137787");
    expect(internationalDigits("+49 170 1234567")).toBe("491701234567");
  });

  it("prefixul 00 înseamnă tot internațional", () => {
    expect(internationalDigits("0040723137787")).toBe("40723137787");
  });

  it("textul lipit după număr nu strică nimic", () => {
    expect(internationalDigits("+40 723 137 787 – WhatsApp")).toBe("40723137787");
  });

  it("un câmp gol sau prea scurt nu face buton", () => {
    expect(internationalDigits("")).toBeNull();
    expect(internationalDigits("112")).toBeNull();
  });

  it("butonul de apel și cel de WhatsApp", () => {
    expect(telHref("0723 137 787")).toBe("tel:+40723137787");
    expect(whatsappHref("0723 137 787")).toBe("https://wa.me/40723137787");
  });
});
