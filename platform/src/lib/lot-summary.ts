/**
 * Socoteala unui lot la închidere, pentru crescător.
 *
 * Un lot are până la 20 de porumbei care se închid în același interval. De aceea
 * crescătorul primește un singur mesaj pe lot, cu totalul, comisionul reținut și
 * ce îi revine — nu câte un e-mail pe porumbel.
 *
 * Pur: se poate verifica fără bază de date.
 */

export type LotAuction = {
  order: { amountCents: number; commissionCents: number } | null;
};

export type LotSums = {
  /** porumbei cu cumpărător */
  sold: number;
  /** porumbei rămași nevânduți (fără ofertă sau sub prețul de rezervă) */
  unsold: number;
  totalCents: number;
  commissionCents: number;
  /** cât îi revine crescătorului, înainte de plățile cumpărătorilor */
  payoutCents: number;
};

export function lotSums(auctions: LotAuction[]): LotSums {
  const vandute = auctions.filter((a) => a.order !== null);
  const totalCents = vandute.reduce((n, a) => n + a.order!.amountCents, 0);
  const commissionCents = vandute.reduce((n, a) => n + a.order!.commissionCents, 0);
  return {
    sold: vandute.length,
    unsold: auctions.length - vandute.length,
    totalCents,
    commissionCents,
    payoutCents: totalCents - commissionCents,
  };
}
