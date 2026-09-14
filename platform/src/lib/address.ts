import { z } from "zod";

/**
 * Datele de contact cerute cumpărătorilor la licitațiile pe loturi.
 *
 * Plata se face în contul firmei sau numerar, iar porumbeii se predau după
 * plată — administratorul trebuie să știe cine e omul și unde îi trimite
 * porumbeii. Județul și codul poștal rămân opționale: cumpărătorii din alte
 * țări nu au județ.
 */

export const PHONE_RE = /^[+0-9 ()./-]{6,40}$/;

export const contactSchema = z.object({
  phone: z
    .string()
    .trim()
    .min(6, "Scrie numărul de telefon.")
    .max(40)
    .regex(PHONE_RE, "Doar cifre, spații și +. Ex.: 0723 137 787"),
  addressStreet: z.string().trim().min(2, "Scrie strada și numărul.").max(200),
  addressCity: z.string().trim().min(2, "Scrie localitatea.").max(120),
  addressCounty: z.string().trim().max(120).optional(),
  addressPostalCode: z.string().trim().max(20).optional(),
  addressCountry: z.string().trim().min(2, "Scrie țara.").max(80),
});

export type ContactData = z.infer<typeof contactSchema>;

/** Câmpurile opționale goale se țin ca „lipsă", nu ca text gol. */
export function contactToDb(d: ContactData) {
  return {
    phone: d.phone,
    addressStreet: d.addressStreet,
    addressCity: d.addressCity,
    addressCounty: d.addressCounty || null,
    addressPostalCode: d.addressPostalCode || null,
    addressCountry: d.addressCountry,
  };
}
