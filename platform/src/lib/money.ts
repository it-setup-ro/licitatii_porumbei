export function formatMoney(cents: number, currency: string, locale: string): string {
  const fractions = {
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  };
  const n = new Intl.NumberFormat(locale === "ro" ? "ro-RO" : "en-GB", fractions).format(
    cents / 100
  );
  // Intl scrie „RON"; clientul și cumpărătorii spun „lei"
  if (currency === "RON") return `${n} lei`;
  // Semnul euro se pune de mână: Node-ul de pe server n-are datele ICU complete
  // și scria „575 EUR" în loc de „575 €", deși local arăta corect.
  if (currency === "EUR") return locale === "ro" ? `${n} €` : `€${n}`;
  return new Intl.NumberFormat(locale === "ro" ? "ro-RO" : "en-GB", {
    style: "currency",
    currency,
    ...fractions,
  }).format(cents / 100);
}

export function parseMoneyToCents(input: string | number): number | null {
  if (typeof input === "number") {
    if (!Number.isFinite(input) || input < 0) return null;
    return Math.round(input * 100);
  }
  const cleaned = input.replace(/\s/g, "").replace(",", ".");
  const num = Number(cleaned);
  if (!Number.isFinite(num) || num < 0) return null;
  return Math.round(num * 100);
}
