/**
 * Întrebările de la Ajutor.
 *
 * Grupele sunt fixe (nu text liber scris de admin), ca titlurile lor să poată fi
 * traduse în toate limbile site-ului: un cumpărător din Olanda trebuie să vadă
 * „Betalen”, nu „Plata”.
 */

export const FAQ_CATEGORIES = ["ACCOUNT", "BIDDING", "PAYMENT", "SHIPPING", "OTHER"] as const;

export type FaqCategory = (typeof FAQ_CATEGORIES)[number];

export function isFaqCategory(x: unknown): x is FaqCategory {
  return typeof x === "string" && (FAQ_CATEGORIES as readonly string[]).includes(x);
}

/** Etichetele din administrare (panoul e în română). */
export const FAQ_CATEGORY_LABELS_RO: Record<FaqCategory, string> = {
  ACCOUNT: "Cont și înscriere",
  BIDDING: "Cum licitez",
  PAYMENT: "Plata",
  SHIPPING: "Transport și predare",
  OTHER: "Altele",
};
