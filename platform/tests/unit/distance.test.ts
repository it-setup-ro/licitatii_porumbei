import { describe, it, expect } from "vitest";
import { parseDistance, formatDistance, distanceToInput } from "../../src/lib/distance";

describe("distanța concursului — citirea din formular", () => {
  it("un număr simplu", () => {
    expect(parseDistance("200")).toEqual({ min: 200, max: null });
  });

  it("un interval, cum l-a cerut clientul", () => {
    expect(parseDistance("170-240")).toEqual({ min: 170, max: 240 });
  });

  it("acceptă spații, „km” și liniuța lungă", () => {
    expect(parseDistance(" 170 - 240 km ")).toEqual({ min: 170, max: 240 });
    expect(parseDistance("170–240")).toEqual({ min: 170, max: 240 });
    expect(parseDistance("200km")).toEqual({ min: 200, max: null });
  });

  it("punctul e separator de mii, nu virgulă zecimală", () => {
    expect(parseDistance("1.000-1.200")).toEqual({ min: 1000, max: 1200 });
  });

  it("intervalul scris invers se întoarce singur", () => {
    expect(parseDistance("240-170")).toEqual({ min: 170, max: 240 });
  });

  it("un interval cu capete egale e un singur număr", () => {
    expect(parseDistance("200-200")).toEqual({ min: 200, max: null });
  });

  it("câmpul gol înseamnă „fără distanță”", () => {
    expect(parseDistance("")).toBeNull();
    expect(parseDistance("   ")).toBeNull();
  });

  it("ce nu se poate citi e refuzat, nu ghicit", () => {
    expect(parseDistance("cam 200")).toBe("INVALID");
    expect(parseDistance("200-")).toBe("INVALID");
    expect(parseDistance("0")).toBe("INVALID");
    expect(parseDistance("30000")).toBe("INVALID");
  });
});

describe("distanța concursului — afișarea", () => {
  it("în română, cu punct la mii", () => {
    expect(formatDistance(1000, 1200, "ro-RO")).toBe("1.000–1.200");
    expect(formatDistance(170, 240, "ro-RO")).toBe("170–240");
    expect(formatDistance(200, null, "ro-RO")).toBe("200");
  });

  it("în engleză, cu virgulă la mii", () => {
    expect(formatDistance(1000, 1200, "en-GB")).toBe("1,000–1,200");
  });

  it("înapoi în formular, cum a fost scris", () => {
    expect(distanceToInput(170, 240)).toBe("170-240");
    expect(distanceToInput(200, null)).toBe("200");
    expect(distanceToInput(null, null)).toBe("");
  });
});
