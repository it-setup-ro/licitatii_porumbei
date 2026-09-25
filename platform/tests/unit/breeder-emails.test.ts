import { describe, it, expect } from "vitest";
import { lotSums } from "@/lib/lot-summary";
import { lotClosedText, settlementText } from "@/lib/breeder-emails";

/**
 * Un lot are până la 20 de porumbei: crescătorul primește un singur rezumat, cu
 * sumele scrise pentru om. Aici se verifică exact ce citește în e-mail.
 */
const vandut = (amount: number, commission: number) => ({ order: { amountCents: amount, commissionCents: commission } });

describe("socoteala lotului", () => {
  it("adună doar porumbeii cu cumpărător", () => {
    const s = lotSums([vandut(170000, 18700), vandut(50000, 5500), { order: null }]);
    expect(s).toEqual({
      sold: 2,
      unsold: 1,
      totalCents: 220000,
      commissionCents: 24200,
      payoutCents: 195800,
    });
  });

  it("un lot fără nicio vânzare nu iese cu sume negative", () => {
    expect(lotSums([{ order: null }, { order: null }])).toEqual({
      sold: 0,
      unsold: 2,
      totalCents: 0,
      commissionCents: 0,
      payoutCents: 0,
    });
  });
});

describe("e-mailul de la închiderea lotului", () => {
  const date = {
    locale: "ro",
    lotLabel: "1",
    sale: "Licitația Burca Ionuț",
    currency: "RON",
    commissionPercent: 11,
    rows: [
      { pigeon: "BIBI", ring: "RO 2025 123456", priceCents: 170000, buyer: "Peex" },
      { pigeon: "GURA", ring: "RO 2025 123457", priceCents: 50000, buyer: null },
    ],
    url: "https://exemplu.ro/ro/breeder/sales",
  };

  it("spune lotul, sumele și porumbeii, cu bani scriși omenește", () => {
    const t = lotClosedText({ ...date, sums: lotSums([vandut(170000, 18700), vandut(50000, 5500)]) });
    expect(t).toContain("Lotul 1 din licitația „Licitația Burca Ionuț” s-a încheiat.");
    expect(t).toContain("S-au vândut 2 din 2 porumbei.");
    expect(t).toContain("Total: 2.200 lei");
    expect(t).toContain("Comision (11%): 242 lei");
    expect(t).toContain("Îți revin: 1.958 lei");
    expect(t).toContain("BIBI (RO 2025 123456) — 1.700 lei — Peex");
    expect(t).toContain(date.url);
    expect(t).not.toContain("Cents");
  });

  it("aliasul lipsă nu lasă o liniuță goală după preț", () => {
    const t = lotClosedText({ ...date, sums: lotSums([vandut(170000, 18700), vandut(50000, 5500)]) });
    expect(t).toContain("GURA (RO 2025 123457) — 500 lei\n");
  });

  it("un lot nevândut primește un mesaj scurt, fără liste și fără sume", () => {
    const t = lotClosedText({ ...date, rows: [], sums: lotSums([{ order: null }]) });
    expect(t).toContain("Nu s-a vândut niciun porumbel din acest lot.");
    expect(t).not.toContain("Total:");
    expect(t).toContain(date.url);
  });

  it("merge în limba contului", () => {
    const t = lotClosedText({
      ...date,
      locale: "en",
      sums: lotSums([vandut(170000, 18700)]),
      rows: [date.rows[0]],
    });
    expect(t).toContain("has closed");
    expect(t).toContain("1,700 lei");
  });
});

describe("e-mailul de decont", () => {
  it("spune licitația, câți porumbei și cât îi revine", () => {
    const t = settlementText({
      locale: "ro",
      sale: "Licitația Burca Ionuț",
      currency: "RON",
      count: 12,
      totalCents: 1840000,
      commissionCents: 202400,
      payoutCents: 1637600,
      url: "https://exemplu.ro/ro/breeder/settlement",
    });
    expect(t).toContain("Decontul pentru licitația „Licitația Burca Ionuț” a fost făcut.");
    expect(t).toContain("12 porumbei plătiți, total 18.400 lei, comision 2.024 lei.");
    expect(t).toContain("Îți revin: 16.376 lei");
    expect(t).toContain("/ro/breeder/settlement");
  });
});
