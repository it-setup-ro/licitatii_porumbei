/**
 * Țările și județele pentru formularul de cont: se aleg din listă, nu se scriu —
 * „Arad", „arad" și „Jud. Arad" ar fi trei județe diferite în evidență.
 */

import { LOCALES, intlLocale } from "./locales";

export const RO_COUNTRY = "România";

export const RO_COUNTIES = [
  "Alba", "Arad", "Argeș", "Bacău", "Bihor", "Bistrița-Năsăud", "Botoșani", "Brăila",
  "Brașov", "București", "Buzău", "Călărași", "Caraș-Severin", "Cluj", "Constanța",
  "Covasna", "Dâmbovița", "Dolj", "Galați", "Giurgiu", "Gorj", "Harghita", "Hunedoara",
  "Ialomița", "Iași", "Ilfov", "Maramureș", "Mehedinți", "Mureș", "Neamț", "Olt",
  "Prahova", "Sălaj", "Satu Mare", "Sibiu", "Suceava", "Teleorman", "Timiș", "Tulcea",
  "Vâlcea", "Vaslui", "Vrancea",
];

/** Codurile ISO 3166-1 ale țărilor; numele vin din browser, în limba site-ului. */
const COUNTRY_CODES = (
  "AD AE AF AG AL AM AO AR AT AU AZ BA BB BD BE BF BG BH BI BJ BN BO BR BS BT BW BY BZ " +
  "CA CD CF CG CH CI CL CM CN CO CR CU CV CY CZ DE DJ DK DM DO DZ EC EE EG ER ES ET FI " +
  "FJ FM FR GA GB GD GE GH GM GN GQ GR GT GW GY HN HR HT HU ID IE IL IN IQ IR IS IT JM " +
  "JO JP KE KG KH KI KM KN KP KR KW KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MG " +
  "MH MK ML MM MN MR MT MU MV MW MX MY MZ NA NE NG NI NL NO NP NR NZ OM PA PE PG PH PK " +
  "PL PT PW PY QA RO RS RU RW SA SB SC SD SE SG SI SK SL SM SN SO SR SS ST SV SY SZ TD " +
  "TG TH TJ TL TM TN TO TR TT TV TW TZ UA UG US UY UZ VA VC VE VN VU WS XK YE ZA ZM ZW"
).split(" ");

/**
 * Lista de țări pentru select: România și Republica Moldova primele (de acolo
 * vin aproape toți cumpărătorii), apoi restul în ordine alfabetică.
 */
export function countryOptions(locale: string): string[] {
  const intl = intlLocale(locale);
  let dn: Intl.DisplayNames | null = null;
  try {
    dn = new Intl.DisplayNames([intl], { type: "region" });
  } catch {
    // browser vechi: rămân doar primele două
  }
  const romania = locale === "ro" ? RO_COUNTRY : (dn?.of("RO") ?? "Romania");
  const moldova = locale === "ro" ? "Republica Moldova" : (dn?.of("MD") ?? "Moldova");
  const rest = dn
    ? COUNTRY_CODES.filter((c) => c !== "RO" && c !== "MD")
        .map((c) => dn.of(c) ?? c)
        .sort((a, b) => a.localeCompare(b, intl))
    : [];
  return [romania, moldova, ...rest];
}

/** Numele României în toate limbile site-ului, calculat o singură dată. */
let romaniaNames: Set<string> | null = null;

/**
 * România, indiferent de limba în care a fost aleasă — omul care completează
 * în germană alege „Rumänien", iar județul trebuie cerut la fel.
 */
export function isRomania(country: string | null | undefined): boolean {
  const value = (country ?? "").trim();
  if (/^rom[aâ]nia$/i.test(value)) return true;
  if (!romaniaNames) {
    romaniaNames = new Set();
    for (const l of LOCALES) {
      try {
        const name = new Intl.DisplayNames([intlLocale(l)], { type: "region" }).of("RO");
        if (name) romaniaNames.add(name.toLowerCase());
      } catch {
        // fără date pentru limba asta
      }
    }
  }
  return romaniaNames.has(value.toLowerCase());
}
