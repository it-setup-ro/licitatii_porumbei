import { describe, it, expect } from "vitest";
import { computeBid } from "../../src/lib/bidding";
import { planBidRows } from "../../src/lib/bid-history";
import type { IncrementTier } from "../../src/lib/settings";

/**
 * Ce se scrie în istoric la fiecare ofertă.
 *
 * Testul ăsta există pentru că Daniel a văzut pe site două rânduri cu 850 lei
 * pe același porumbel. Cauza: cel depășit era trecut cu prețul rezultat, nu cu
 * suma lui, iar rândul liderului se rescria pe loc, cu ora veche. Testele de
 * atunci verificau comportamentul existent („primul rând = prețul curent”), nu
 * regulile — deci nu aveau cum să prindă anomalia. Aici verificăm regulile.
 */

const TREPTE: IncrementTier[] = [
  { upToCents: 50_000, stepCents: 2_500 },
  { upToCents: null, stepCents: 5_000 },
];

function planFor(params: {
  bidderId: string;
  maxCents: number;
  currentPriceCents: number;
  leader: { bidderId: string; maxCents: number } | null;
  startPriceCents?: number;
}) {
  const outcome = computeBid({
    bidderId: params.bidderId,
    maxCents: params.maxCents,
    startPriceCents: params.startPriceCents ?? 50_000,
    currentPriceCents: params.currentPriceCents,
    leader: params.leader,
    tiers: TREPTE,
  });
  if (!outcome.accepted) throw new Error("oferta trebuia acceptată");
  return {
    outcome,
    plan: planBidRows({
      bidderId: params.bidderId,
      maxCents: params.maxCents,
      outcome,
      leader: params.leader,
    }),
  };
}

describe("ce se scrie în istoricul ofertelor", () => {
  it("prima ofertă: un singur rând, la prețul de pornire", () => {
    const { plan, outcome } = planFor({
      bidderId: "ana",
      maxCents: 100_000,
      currentPriceCents: 50_000,
      leader: null,
    });
    expect(plan.randuri).toHaveLength(1);
    expect(plan.randuri[0]).toMatchObject({
      bidderId: "ana",
      amountCents: outcome.newPriceCents,
      isLeading: true,
      auto: false,
    });
    expect(plan.vechiulLiderNuMaiConduce).toBe(false);
  });

  it("cine preia conducerea: un rând, cu prețul pe care îl plătește acum", () => {
    const { plan, outcome } = planFor({
      bidderId: "bogdan",
      maxCents: 160_000,
      currentPriceCents: 70_000,
      leader: { bidderId: "ana", maxCents: 70_000 },
    });
    expect(plan.randuri).toHaveLength(1);
    expect(plan.randuri[0].bidderId).toBe("bogdan");
    expect(plan.randuri[0].amountCents).toBe(outcome.newPriceCents);
    // plafonul celui care conduce rămâne secret: nu se scrie ca sumă vizibilă
    expect(plan.randuri[0].amountCents).toBeLessThan(160_000);
    expect(plan.vechiulLiderNuMaiConduce).toBe(true);
  });

  it("depășit instant: se vede suma LUI, apoi răspunsul automat al liderului", () => {
    // exact cazul de pe site: Peex conducea cu plafon 1600, BurcaS a oferit 800
    const { plan, outcome } = planFor({
      bidderId: "burcas",
      maxCents: 80_000,
      currentPriceCents: 75_000,
      leader: { bidderId: "peex", maxCents: 160_000 },
    });

    expect(plan.randuri).toHaveLength(2);
    // 1) omul, cu suma pe care a oferit-o — nu cu prețul rezultat
    expect(plan.randuri[0]).toMatchObject({
      bidderId: "burcas",
      amountCents: 80_000,
      isLeading: false,
      auto: false,
    });
    // 2) răspunsul platformei pentru lider, marcat ca automat
    expect(plan.randuri[1]).toMatchObject({
      bidderId: "peex",
      amountCents: outcome.newPriceCents,
      isLeading: true,
      auto: true,
    });
    // și nu se rescrie nimic vechi: rândul de dinainte doar pierde steluța
    expect(plan.plafonNou).toBeNull();
  });

  it("două rânduri cu aceeași sumă sunt posibile doar dacă unul e automat", () => {
    const { plan } = planFor({
      bidderId: "burcas",
      maxCents: 80_000,
      currentPriceCents: 75_000,
      leader: { bidderId: "peex", maxCents: 160_000 },
    });
    const sume = plan.randuri.map((r) => r.amountCents);
    if (new Set(sume).size !== sume.length) {
      expect(plan.randuri.some((r) => r.auto)).toBe(true);
    }
  });

  it("liderul care își ridică doar plafonul nu adaugă niciun rând", () => {
    const { plan } = planFor({
      bidderId: "ana",
      maxCents: 200_000,
      currentPriceCents: 75_000,
      leader: { bidderId: "ana", maxCents: 160_000 },
    });
    expect(plan.randuri).toEqual([]);
    expect(plan.plafonNou).toBe(200_000);
    expect(plan.vechiulLiderNuMaiConduce).toBe(false);
  });

  it("nicio sumă scrisă nu depășește plafonul celui pe numele căruia se scrie", () => {
    const cazuri = [
      { bidderId: "x", maxCents: 80_000, currentPriceCents: 75_000, leader: { bidderId: "y", maxCents: 160_000 } },
      { bidderId: "x", maxCents: 200_000, currentPriceCents: 75_000, leader: { bidderId: "y", maxCents: 160_000 } },
      { bidderId: "x", maxCents: 60_000, currentPriceCents: 50_000, leader: null },
    ];
    for (const caz of cazuri) {
      const { plan } = planFor(caz);
      for (const rand of plan.randuri) {
        expect(
          rand.amountCents,
          `rândul lui ${rand.bidderId} are ${rand.amountCents}, peste plafonul ${rand.maxAmountCents}`
        ).toBeLessThanOrEqual(rand.maxAmountCents);
      }
    }
  });

  it("exact un rând conduce, la fiecare ofertă", () => {
    const cazuri = [
      { bidderId: "x", maxCents: 80_000, currentPriceCents: 75_000, leader: { bidderId: "y", maxCents: 160_000 } },
      { bidderId: "x", maxCents: 200_000, currentPriceCents: 75_000, leader: { bidderId: "y", maxCents: 160_000 } },
      { bidderId: "x", maxCents: 60_000, currentPriceCents: 50_000, leader: null },
    ];
    for (const caz of cazuri) {
      const { plan } = planFor(caz);
      expect(plan.randuri.filter((r) => r.isLeading)).toHaveLength(1);
    }
  });
});
