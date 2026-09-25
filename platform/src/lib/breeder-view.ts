/**
 * Ce vede crescătorul despre cumpărătorul porumbelului lui.
 *
 * Regula, hotărâtă cu Daniel: până la plată, crescătorul vede doar aliasul și
 * suma — atât îi trebuie ca să urmărească licitația. După ce administratorul
 * marchează „Plătit", vede și numele și localitatea, ca să știe cui pleacă
 * porumbelul. Telefonul și adresa completă rămân la administrator, care se
 * ocupă de transport.
 *
 * Pur: se poate verifica fără bază de date.
 */

/** Stările în care banii au intrat, deci se poate spune cine e omul. */
export const BUYER_REVEALED_STATUSES = ["PAID", "SHIPPED", "DELIVERED"];

export type BuyerForBreeder = {
  /** aliasul, cât timp nu s-a plătit; apoi numele real */
  label: string;
  /** localitatea, doar după plată */
  locality: string | null;
  revealed: boolean;
};

export function buyerForBreeder(order: {
  status: string;
  buyer: {
    name: string;
    nickname: string | null;
    addressCity: string | null;
    addressCountry: string | null;
  };
}): BuyerForBreeder {
  const revealed = BUYER_REVEALED_STATUSES.includes(order.status);
  if (!revealed) {
    return { label: order.buyer.nickname ?? "—", locality: null, revealed: false };
  }
  const locality = [order.buyer.addressCity, order.buyer.addressCountry]
    .filter((x) => x && x.trim())
    .join(", ");
  return { label: order.buyer.name, locality: locality || null, revealed: true };
}
