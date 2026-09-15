import { describe, it, expect } from "vitest";
import { yearFromRing, SEX_SYMBOL } from "../../src/lib/pigeon";

describe("anul din seria inelului", () => {
  const now = new Date("2026-09-15T12:00:00Z");

  it("seria românească cu anul pe patru cifre", () => {
    expect(yearFromRing("RO 2025 123456", now)).toBe(2025);
    expect(yearFromRing("RO-2019-5501", now)).toBe(2019);
  });

  it("anul pe două cifre, după codul țării", () => {
    expect(yearFromRing("BE 23 1234567", now)).toBe(2023);
  });

  it("fără an în serie rămâne anul curent", () => {
    expect(yearFromRing("NL 1234567", now)).toBe(2026);
    expect(yearFromRing("123456", now)).toBe(2026);
  });
});

describe("semnele de sex", () => {
  it("mascul și femelă au semn, puiul nu", () => {
    expect(SEX_SYMBOL.M).toBe("♂");
    expect(SEX_SYMBOL.F).toBe("♀");
    expect(SEX_SYMBOL.U).toBe("");
  });
});
