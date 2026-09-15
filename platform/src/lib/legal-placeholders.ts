/**
 * Datele firmei și regulile din Setări, puse în textele legale la afișare.
 *
 * Clientul: „firma va fi cea care se va scrie în Setări". Termenii și politica
 * de confidențialitate se editează din Administrare → Pagini, cu semne ca
 * {{firma}} sau {{cui}}; la afișare se înlocuiesc cu valorile din Setări. Un
 * câmp gol din Setări apare vizibil ca „de completat", nu dispare din text.
 */

export const PLACEHOLDER_LABELS: Record<string, string> = {
  firma: "denumirea firmei",
  cui: "CUI",
  regcom: "Nr. Reg. Com.",
  sediu: "adresa sediului",
  email: "e-mailul de contact",
  telefon: "telefonul de contact",
  site: "adresa site-ului",
  ore_bolnav: "orele pentru porumbel bolnav la sosire",
  ore_mort: "orele pentru porumbel mort la sosire",
  luni_infertil: "lunile pentru porumbel infertil",
  fereastra_minute: "fereastra de prelungire",
  prelungire_minute: "minutele de prelungire",
};

export function fillPlaceholders(text: string, values: Record<string, string>): string {
  return text.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (match, key: string) => {
    if (!(key in PLACEHOLDER_LABELS)) return match;
    const v = (values[key] ?? "").trim();
    return v || `[${PLACEHOLDER_LABELS[key]} — de completat în Setări]`;
  });
}
