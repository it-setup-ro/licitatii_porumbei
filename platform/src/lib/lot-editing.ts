/**
 * Cine poate modifica un lot și cât, în funcție de starea lui.
 *
 * Regula de fond: cine a licitat a licitat pe ce a văzut. Din prima ofertă,
 * datele care contează la o decizie de cumpărare — seria inelului, anul, sexul
 * și prețul — se blochează. Se pot doar ADĂUGA poze, clipuri și completări de
 * text, exact ca pe pipa sau eBay.
 *
 * Logica stă aici, separată de bază de date și de interfață, ca să poată fi
 * verificată direct în teste: e genul de regulă care, greșită, produce fie
 * licitații nemodificabile, fie licitații care se schimbă sub ochii ofertanților.
 */

export type EditScope =
  /** se poate schimba orice */
  | "FULL"
  /** doar completări: poze, clipuri, text în plus */
  | "ADDITIONS_ONLY"
  /** nimic */
  | "NONE";

export type LotState = {
  status: string;
  bidCount: number;
};

/** Câmpurile pentru care se cere din nou aprobarea adminului. */
export const MATERIAL_FIELDS = ["ringNumber", "birthYear", "sex", "startPriceCents"] as const;
export type MaterialField = (typeof MATERIAL_FIELDS)[number];

/**
 * Ce are voie să schimbe cineva pe lotul ăsta.
 * Adminul poate corecta orice, oricând — inclusiv pe loturile închise.
 */
export function editScope(lot: LotState, isAdmin: boolean): EditScope {
  if (isAdmin) return "FULL";

  switch (lot.status) {
    case "PENDING_APPROVAL":
    case "REJECTED":
    case "DRAFT":
      return "FULL";
    case "SCHEDULED":
      return "FULL";
    case "LIVE":
      return lot.bidCount > 0 ? "ADDITIONS_ONLY" : "FULL";
    default:
      // CLOSED, CANCELLED
      return "NONE";
  }
}

/**
 * Trebuie lotul retrimis la aprobare după modificările astea?
 *
 * Un lot deja public care își schimbă seria inelului sau prețul nu mai e
 * lotul aprobat de admin — iese din public până se uită cineva peste el.
 */
export function needsReapproval(
  lot: LotState,
  changed: readonly string[],
  isAdmin: boolean
): boolean {
  if (isAdmin) return false;
  if (!["SCHEDULED", "LIVE"].includes(lot.status)) return false;
  return changed.some((f) => (MATERIAL_FIELDS as readonly string[]).includes(f));
}

/** Câmpurile modificate între două versiuni, comparate ca text. */
export function changedFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): string[] {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const out: string[] = [];
  for (const k of keys) {
    const a = before[k] ?? "";
    const b = after[k] ?? "";
    if (String(a) !== String(b)) out.push(k);
  }
  return out;
}

/**
 * Adaugă o completare la descriere, datată, în loc să rescrie textul.
 *
 * Așa vede și un ofertant care a citit descrierea acum două zile ce s-a
 * adăugat între timp — o rescriere tăcută i-ar schimba târgul sub ochi.
 */
export function appendNote(existing: string | null, note: string, when = new Date()): string {
  const stamp = `${String(when.getDate()).padStart(2, "0")}.${String(
    when.getMonth() + 1
  ).padStart(2, "0")}.${when.getFullYear()}`;
  const addition = `— Completare ${stamp}: ${note.trim()}`;
  return existing && existing.trim() ? `${existing.trim()}\n\n${addition}` : addition;
}
