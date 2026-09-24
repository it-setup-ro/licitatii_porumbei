import type { BidOutcome } from "./bidding";

/**
 * Ce se scrie în istoric la fiecare ofertă.
 *
 * Daniel, văzând două rânduri cu 850 lei pe același porumbel: „nu e normal…
 * cum s-a întâmplat?". Se întâmplase din două motive:
 *  - cel depășit instant era trecut cu prețul rezultat (850), nu cu suma pe care
 *    o oferise el (800) — adică o sumă pe care omul nu o dăduse niciodată;
 *  - răspunsul automat al platformei rescria rândul liderului, păstrându-i ora
 *    veche, deci istoricul arăta o ofertă la o oră la care nu se întâmplase.
 *
 * De acum istoricul e un jurnal de fapte: fiecare rând rămâne cum a fost scris,
 * iar răspunsul automat e un rând nou, marcat ca atare.
 *
 * Reguli, pe scurt:
 *  - cine preia conducerea: un rând cu prețul pe care îl plătește acum
 *    (plafonul lui rămâne secret — încă poate urca);
 *  - cine e depășit instant: un rând cu suma lui, care tocmai a fost bătută
 *    (plafonul depășit se vede: nu mai are ce ascunde);
 *  - liderul care rămâne lider: un rând nou, „automat", cu noul preț;
 *  - liderul care doar își ridică plafonul: niciun rând (public nu s-a schimbat
 *    nimic), doar plafonul lui se actualizează.
 */

export type RandDeScris = {
  bidderId: string;
  amountCents: number;
  maxAmountCents: number;
  isLeading: boolean;
  /** răspunsul platformei în numele liderului, nu o apăsare de buton */
  auto: boolean;
};

export type PlanIstoric = {
  /** rândurile noi, în ordinea în care s-au întâmplat */
  randuri: RandDeScris[];
  /** rândul care conducea până acum pierde steluța */
  vechiulLiderNuMaiConduce: boolean;
  /** liderul doar și-a ridicat plafonul: atât se schimbă, pe rândul lui */
  plafonNou: number | null;
};

export function planBidRows(params: {
  bidderId: string;
  maxCents: number;
  outcome: Extract<BidOutcome, { accepted: true }>;
  leader: { bidderId: string; maxCents: number } | null;
}): PlanIstoric {
  const { bidderId, maxCents, outcome, leader } = params;

  // liderul își ridică doar plafonul: nimic public nu s-a schimbat
  if (outcome.raisedOwnCeiling) {
    return { randuri: [], vechiulLiderNuMaiConduce: false, plafonNou: maxCents };
  }

  // cel care a licitat preia conducerea (sau e primul)
  if (outcome.callerIsLeading) {
    return {
      randuri: [
        {
          bidderId,
          amountCents: outcome.newPriceCents,
          maxAmountCents: maxCents,
          isLeading: true,
          auto: false,
        },
      ],
      vechiulLiderNuMaiConduce: leader !== null && leader.bidderId !== bidderId,
      plafonNou: null,
    };
  }

  // depășit instant: se vede suma lui, apoi răspunsul automat al liderului
  const randuri: RandDeScris[] = [
    {
      bidderId,
      amountCents: maxCents,
      maxAmountCents: maxCents,
      isLeading: false,
      auto: false,
    },
  ];
  if (leader) {
    randuri.push({
      bidderId: leader.bidderId,
      amountCents: outcome.newPriceCents,
      maxAmountCents: leader.maxCents,
      isLeading: true,
      auto: true,
    });
  }
  return { randuri, vechiulLiderNuMaiConduce: leader !== null, plafonNou: null };
}
