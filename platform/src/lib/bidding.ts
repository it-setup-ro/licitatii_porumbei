import type { IncrementTier } from "./settings";

/**
 * Logica pura de proxy-bidding (stil eBay) — fara DB, complet testabila.
 *
 * Reguli:
 * - Fiecare ofertant da un plafon maxim (secret). Pretul vizibil devine
 *   min(plafonLider, plafonContracandidat + increment).
 * - Daca noul plafon <= plafonul liderului, liderul ramane si pretul urca la
 *   min(plafonLider, plafonNou + increment). Noul ofertant e depasit instant.
 * - Daca noul plafon > plafonul liderului, noul ofertant preia conducerea la
 *   min(plafonNou, plafonLider + increment).
 * - Liderul curent isi poate doar ridica plafonul (pretul vizibil nu se schimba).
 * - Prima oferta: pretul vizibil = pretul de pornire.
 */

export function incrementFor(priceCents: number, tiers: IncrementTier[]): number {
  for (const tier of tiers) {
    if (tier.upToCents === null || priceCents < tier.upToCents) return tier.stepCents;
  }
  return tiers.length > 0 ? tiers[tiers.length - 1].stepCents : 500;
}

export function minimumAcceptableMax(
  currentPriceCents: number,
  hasBids: boolean,
  startPriceCents: number,
  tiers: IncrementTier[]
): number {
  if (!hasBids) return startPriceCents;
  return currentPriceCents + incrementFor(currentPriceCents, tiers);
}

export type Leader = { bidderId: string; maxCents: number };

export type BidInput = {
  bidderId: string;
  maxCents: number;
  startPriceCents: number;
  currentPriceCents: number;
  leader: Leader | null;
  tiers: IncrementTier[];
};

export type BidOutcome =
  | { accepted: false; reason: "BELOW_MINIMUM"; minimumCents: number }
  | {
      accepted: true;
      newLeader: Leader;
      newPriceCents: number;
      /** ofertantul depasit instant (plafon insuficient), daca exista */
      outbidBidderId: string | null;
      /** true daca cel care a plasat e acum lider */
      callerIsLeading: boolean;
      /** true daca liderul doar si-a ridicat plafonul */
      raisedOwnCeiling: boolean;
    };

export function computeBid(input: BidInput): BidOutcome {
  const { bidderId, maxCents, startPriceCents, currentPriceCents, leader, tiers } = input;

  // Liderul curent isi ridica plafonul
  if (leader && leader.bidderId === bidderId) {
    if (maxCents <= leader.maxCents) {
      return {
        accepted: false,
        reason: "BELOW_MINIMUM",
        minimumCents: leader.maxCents + incrementFor(currentPriceCents, tiers),
      };
    }
    return {
      accepted: true,
      newLeader: { bidderId, maxCents },
      newPriceCents: currentPriceCents,
      outbidBidderId: null,
      callerIsLeading: true,
      raisedOwnCeiling: true,
    };
  }

  const minimum = minimumAcceptableMax(currentPriceCents, leader !== null, startPriceCents, tiers);
  if (maxCents < minimum) {
    return { accepted: false, reason: "BELOW_MINIMUM", minimumCents: minimum };
  }

  // Prima oferta
  if (!leader) {
    return {
      accepted: true,
      newLeader: { bidderId, maxCents },
      newPriceCents: startPriceCents,
      outbidBidderId: null,
      callerIsLeading: true,
      raisedOwnCeiling: false,
    };
  }

  // Pasul se calculeaza la nivelul de pret unde are loc competitia (plafonul
  // invins), nu la pretul vizibil vechi — altfel la plafoane mari pretul ar
  // sari cu un pas nejustificat de mic.
  if (maxCents > leader.maxCents) {
    // Noul ofertant preia conducerea
    const step = incrementFor(leader.maxCents, tiers);
    return {
      accepted: true,
      newLeader: { bidderId, maxCents },
      newPriceCents: Math.min(maxCents, leader.maxCents + step),
      outbidBidderId: leader.bidderId,
      callerIsLeading: true,
      raisedOwnCeiling: false,
    };
  }

  // Plafon insuficient: liderul ramane, pretul urca (egalitate: primul venit castiga)
  const step = incrementFor(maxCents, tiers);
  return {
    accepted: true,
    newLeader: leader,
    newPriceCents: Math.min(leader.maxCents, maxCents + step),
    outbidBidderId: bidderId,
    callerIsLeading: false,
    raisedOwnCeiling: false,
  };
}

/** Anti-sniping: daca oferta vine in fereastra finala, licitatia se prelungeste. */
export function computeExtension(params: {
  now: Date;
  endsAt: Date;
  snipeWindowMinutes: number;
  extensionMinutes: number;
  extensionsCount: number;
  maxExtensions: number;
}): Date | null {
  const { now, endsAt, snipeWindowMinutes, extensionMinutes, extensionsCount, maxExtensions } =
    params;
  if (extensionsCount >= maxExtensions) return null;
  const msLeft = endsAt.getTime() - now.getTime();
  if (msLeft <= 0) return null;
  if (msLeft > snipeWindowMinutes * 60_000) return null;
  return new Date(endsAt.getTime() + extensionMinutes * 60_000);
}
