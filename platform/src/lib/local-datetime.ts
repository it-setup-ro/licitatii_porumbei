/**
 * Câmpurile `datetime-local` nu au fus orar: „2026-09-20T20:00" înseamnă ora
 * 20:00 a celui care se uită. Conversia se face în browser, cu ora lui — nu pe
 * server, care poate rula în UTC și ar muta orele cu 2–3 ore.
 */

const pad = (n: number) => String(n).padStart(2, "0");

/** ISO (din baza de date) → „2026-09-20T20:00", în ora locală a browserului. */
export function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** „2026-09-20T20:00" (ora locală) → ISO, pentru server. Gol dacă nu e completat. */
export function localInputToIso(value: string): string {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}
