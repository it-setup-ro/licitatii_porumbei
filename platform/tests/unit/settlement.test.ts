import { describe, it, expect } from "vitest";
import { settlementSummary } from "../../src/lib/settlement-math";
import { paymentInstructionsText } from "../../src/lib/payment-instructions";

describe("decontul", () => {
  it("intră doar porumbeii plătiți și nedecontați; neplătiții apar separat", () => {
    const s = settlementSummary([
      { status: "PAID", amountCents: 100_000, commissionCents: 15_000, settlementId: null },
      { status: "DELIVERED", amountCents: 220_000, commissionCents: 33_000, settlementId: null },
      { status: "DELIVERED", amountCents: 50_000, commissionCents: 7_500, settlementId: "vechi" },
      { status: "PENDING_PAYMENT", amountCents: 80_000, commissionCents: 12_000, settlementId: null },
    ]);
    // exemplul din cerințe: 3.200 vândut, 15% comision, 2.720 crescătorului
    expect(s.due).toEqual({ count: 2, totalCents: 320_000, commissionCents: 48_000, payoutCents: 272_000 });
    expect(s.unpaid).toEqual({ count: 1, totalCents: 80_000 });
    expect(s.settledCount).toBe(1);
  });

  it("fără porumbei plătiți, nimic de decontat", () => {
    expect(settlementSummary([]).due).toEqual({ count: 0, totalCents: 0, commissionCents: 0, payoutCents: 0 });
  });
});

describe("datele de plată pentru câștigător", () => {
  const base = {
    locale: "ro" as const,
    won: true,
    pigeon: "Albastrul",
    label: "1.04",
    ring: "RO 2025 123456",
    amountCents: 120_900,
    currency: "RON",
    eurRate: 5.2567,
    orderUrl: "https://site/ro/orders/abc",
  };

  it("suma cu echivalentul, contul firmei, numerarul, regula predării și telefonul", () => {
    const text = paymentInstructionsText({
      ...base,
      details: { companyName: "Demeco SRL", iban: "RO49AAAA1B31007593840000", bank: "Banca Test", phone: "0740 000 000" },
    });
    expect(text).toContain("Felicitări! Ai câștigat porumbelul Lotul 1.04 Albastrul (serie RO 2025 123456).");
    expect(text).toContain("Suma de plată: 1.209 lei (≈ 230 €)");
    expect(text).toContain("IBAN: RO49AAAA1B31007593840000");
    expect(text).toContain("La detalii plată scrie: Lotul 1.04 Albastrul");
    expect(text).toContain("numerar");
    expect(text).toContain("Porumbeii se predau după plată.");
    expect(text).toContain("0740 000 000");
    expect(text).toContain("https://site/ro/orders/abc");
  });

  it("fără IBAN în Setări nu trimite un cont gol", () => {
    const text = paymentInstructionsText({
      ...base,
      won: false,
      details: { companyName: "", iban: "", bank: "", phone: "" },
    });
    expect(text).toContain("la preț fix");
    expect(text).not.toContain("IBAN:");
    expect(text).toContain("îți vor fi trimise de administrator");
  });
});
