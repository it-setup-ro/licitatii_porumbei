import { describe, it, expect } from "vitest";
import {
  parseBnrEur,
  convertCents,
  equivalentLabel,
  otherCurrency,
} from "../../src/lib/fx-math";
import { formatMoney } from "../../src/lib/money";

const XML = `<?xml version="1.0" encoding="utf-8"?>
<DataSet xmlns="http://www.bnr.ro/xsd">
  <Header><Publisher>National Bank of Romania</Publisher></Header>
  <Body>
    <OrigCurrency>RON</OrigCurrency>
    <Cube date="2026-09-14">
      <Rate currency="AED">1.1734</Rate>
      <Rate currency="EUR">5.2567</Rate>
      <Rate currency="HUF" multiplier="100">1.2345</Rate>
    </Cube>
  </Body>
</DataSet>`;

describe("cursul BNR", () => {
  it("citește cursul euro și ziua", () => {
    expect(parseBnrEur(XML)).toEqual({ rate: 5.2567, date: "2026-09-14" });
  });

  it("ține cont de multiplicator", () => {
    const xml = XML.replace('<Rate currency="EUR">5.2567</Rate>', '<Rate currency="EUR" multiplier="100">525.67</Rate>');
    expect(parseBnrEur(xml)?.rate).toBeCloseTo(5.2567, 6);
  });

  it("fără euro sau fără dată nu inventează un curs", () => {
    expect(parseBnrEur(XML.replace(/<Rate currency="EUR">[^<]*<\/Rate>/, ""))).toBeNull();
    expect(parseBnrEur("<html>prima pagina BNR</html>")).toBeNull();
  });
});

describe("lei și euro", () => {
  it("convertește în ambele sensuri", () => {
    expect(convertCents(52_567, "RON", 5.2567)).toBe(10_000);
    expect(convertCents(10_000, "EUR", 5.2567)).toBe(52_567);
  });

  it("echivalentul e rotunjit la unități întregi", () => {
    // 1.500 lei / 5,2567 = 285,35 €
    expect(equivalentLabel(150_000, "RON", "ro", 5.2567)).toBe(`≈ ${formatMoney(28_500, "EUR", "ro")}`);
    expect(equivalentLabel(10_000, "EUR", "ro", 5.2567)).toBe("≈ 526 lei");
  });

  it("fără curs sau pentru altă monedă nu arată nimic", () => {
    expect(equivalentLabel(10_000, "EUR", "ro", 0)).toBeNull();
    expect(otherCurrency("USD")).toBeNull();
  });

  it("leii se scriu „lei”, nu „RON”", () => {
    expect(formatMoney(150_000, "RON", "ro")).toBe("1.500 lei");
  });

  it("euro are semnul €, oricare ar fi datele ICU ale serverului", () => {
    expect(formatMoney(57_500, "EUR", "ro")).toBe("575 €");
    expect(formatMoney(57_550, "EUR", "en")).toBe("€575.50");
    expect(equivalentLabel(120_900, "RON", "ro", 5.2567)).toBe("≈ 230 €");
  });
});
