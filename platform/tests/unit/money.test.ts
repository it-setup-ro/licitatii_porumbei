import { describe, it, expect } from "vitest";
import { formatMoney, parseMoneyToCents } from "@/lib/money";

describe("parseMoneyToCents", () => {
  it("numar simplu", () => expect(parseMoneyToCents("250")).toBe(25_000));
  it("virgula romaneasca", () => expect(parseMoneyToCents("250,50")).toBe(25_050));
  it("punct zecimal", () => expect(parseMoneyToCents("250.50")).toBe(25_050));
  it("spatii ignorate", () => expect(parseMoneyToCents(" 1 250 ")).toBe(125_000));
  it("negativ respins", () => expect(parseMoneyToCents("-5")).toBeNull());
  it("text respins", () => expect(parseMoneyToCents("abc")).toBeNull());
});

describe("formatMoney", () => {
  it("EUR in engleza", () => {
    const s = formatMoney(25_000, "EUR", "en");
    expect(s).toContain("250");
    expect(s).toMatch(/€|EUR/);
  });
  it("suma cu zecimale pastreaza centii", () => {
    expect(formatMoney(25_050, "EUR", "en")).toContain("250.50");
  });
});
