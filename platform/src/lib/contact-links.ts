/**
 * Legăturile de contact din cardurile de transportatori și agenți.
 *
 * Oamenii își scriu numărul cum sunt obișnuiți: „0723 137 787",
 * „+40 723 137 787", „0040723137787". Butonul de apel și cel de WhatsApp au
 * nevoie de aceeași formă internațională, doar cifre.
 */

/**
 * Cifrele numărului în forma internațională, fără „+".
 * Un număr care începe cu un singur 0 e considerat românesc (07… -> 407…):
 * așa îl scrie orice om din România, iar platforma e românească.
 */
export function internationalDigits(phone: string): string | null {
  const trimmed = phone.trim();
  if (!trimmed) return null;

  let digits = trimmed.replace(/\D/g, "");
  if (!trimmed.startsWith("+")) {
    if (digits.startsWith("00")) digits = digits.slice(2);
    else if (digits.startsWith("0")) digits = `40${digits.slice(1)}`;
  }
  return digits.length >= 8 ? digits : null;
}

/** „0723 137 787" -> „tel:+40723137787" */
export function telHref(phone: string): string | null {
  const digits = internationalDigits(phone);
  return digits ? `tel:+${digits}` : null;
}

/** „0723 137 787" -> „https://wa.me/40723137787" */
export function whatsappHref(phone: string): string | null {
  const digits = internationalDigits(phone);
  return digits ? `https://wa.me/${digits}` : null;
}
