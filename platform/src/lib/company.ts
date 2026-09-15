/**
 * Datele de firmă la înregistrare (persoană juridică).
 *
 * CUI-ul românesc are o cifră de control: o greșeală de tastare se prinde pe
 * loc, nu la emiterea facturii. Firmele din alte țări au alte formate, deci la
 * ele se verifică doar lungimea.
 */

const CUI_KEY = [7, 5, 3, 2, 1, 7, 5, 3, 2];

/** „RO 44997978", „44997978" → valid dacă cifra de control se potrivește. */
export function isValidRoCui(input: string): boolean {
  const s = input.toUpperCase().replace(/\s/g, "").replace(/^RO/, "");
  if (!/^\d{2,10}$/.test(s)) return false;
  const digits = s.split("").map(Number);
  const control = digits.pop()!;
  const padded = [...Array(9 - digits.length).fill(0), ...digits];
  const sum = padded.reduce((acc, d, i) => acc + d * CUI_KEY[i], 0);
  const expected = ((sum * 10) % 11) % 10;
  return expected === control;
}

/** IBAN: literele țării, două cifre de control, restul alfanumeric; spațiile se ignoră. */
export function isPlausibleIban(input: string): boolean {
  const s = input.replace(/\s/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(s)) return false;
  // verificarea mod 97 din standardul IBAN
  const rearranged = s.slice(4) + s.slice(0, 4);
  const numeric = rearranged.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let rest = 0;
  for (const ch of numeric) rest = (rest * 10 + Number(ch)) % 97;
  return rest === 1;
}
