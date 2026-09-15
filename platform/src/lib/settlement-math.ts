/**
 * Decontul cu crescătorul — partea de calcul, fără bază de date.
 *
 * Clientul: „Eu îmi rețin comisionul și trimit banii crescătorului." În decont
 * intră doar porumbeii plătiți și nedecontați încă; cei neplătiți apar separat,
 * ca să nu intre în sumă înainte de vreme.
 */

/** Comenzile care se pot deconta: plătite (SHIPPED e o stare veche, tot plătită). */
export const SETTLEABLE_STATUSES = ["PAID", "SHIPPED", "DELIVERED"];

export type SettlementRow = {
  status: string;
  amountCents: number;
  commissionCents: number;
  settlementId: string | null;
};

export function settlementSummary(rows: SettlementRow[]) {
  const due = rows.filter((r) => SETTLEABLE_STATUSES.includes(r.status) && !r.settlementId);
  const unpaid = rows.filter((r) => r.status === "PENDING_PAYMENT");
  const sum = (xs: SettlementRow[], k: "amountCents" | "commissionCents") =>
    xs.reduce((n, r) => n + r[k], 0);
  const totalCents = sum(due, "amountCents");
  const commissionCents = sum(due, "commissionCents");
  return {
    due: { count: due.length, totalCents, commissionCents, payoutCents: totalCents - commissionCents },
    unpaid: { count: unpaid.length, totalCents: sum(unpaid, "amountCents") },
    settledCount: rows.filter((r) => r.settlementId).length,
  };
}
