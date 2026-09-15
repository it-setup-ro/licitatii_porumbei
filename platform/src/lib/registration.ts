import { z } from "zod";
import { nicknameSchema } from "./nickname";
import { passwordSchema } from "./password";
import { PHONE_RE } from "./address";
import { isPlausibleIban, isValidRoCui } from "./company";
import { isRomania } from "./regions";

/**
 * Datele contului nou, după exemplele date de client (voiajor.net, columbofil.net).
 *
 * Clientul: „date complete, obligatorii doar ce e obligatoriu: nume firmă, CUI,
 * Reg. Com., adresă sediu; ce nu e obligatoriu să nu fie cu steluță, dar să fie
 * completabile". Persoana fizică dă numele, contactul și adresa; persoana
 * juridică, în plus, datele firmei. Acordul pentru termeni e obligatoriu, cel
 * pentru noutăți nu.
 */

const optional = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

export const registrationSchema = z
  .object({
    accountType: z.enum(["PERSON", "COMPANY"]).default("PERSON"),
    firstName: z.string().trim().min(2, "Scrie prenumele.").max(60),
    lastName: z.string().trim().min(2, "Scrie numele.").max(60),
    nickname: nicknameSchema,
    email: z.string().trim().email("Adresa de e-mail nu e scrisă corect.").toLowerCase().max(200),
    password: passwordSchema,
    phone: z
      .string()
      .trim()
      .min(6, "Scrie numărul de telefon.")
      .max(40)
      .regex(PHONE_RE, "Doar cifre, spații și +. Ex.: 0723 137 787"),
    addressCountry: z.string().trim().min(2, "Alege țara.").max(80),
    addressCounty: optional(120),
    addressCity: z.string().trim().min(2, "Scrie localitatea.").max(120),
    addressPostalCode: optional(20),
    addressStreet: z.string().trim().min(2, "Scrie adresa: strada și numărul.").max(200),
    companyName: optional(200),
    companyCui: optional(20),
    companyRegCom: optional(40),
    companyAddress: optional(300),
    companyBank: optional(120),
    companyIban: optional(40),
    acceptTerms: z.literal(true, {
      message: "Trebuie să accepți Termenii și condițiile și Politica de confidențialitate.",
    }),
    notifyAuctionEnding: z.boolean().default(false),
    locale: z.enum(["ro", "en"]).default("ro"),
    captcha: z.string().max(10_000).optional(),
    // fluxul vechi, prin care crescătorii își cereau cont de vânzător
    wantsSeller: z.boolean().default(false),
    sellerCompany: z.string().max(200).optional(),
    sellerCui: z.string().max(40).optional(),
    sellerIban: z.string().max(40).optional(),
  })
  .superRefine((d, ctx) => {
    const issue = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });
    const romania = isRomania(d.addressCountry);
    if (romania && !d.addressCounty) issue("addressCounty", "Alege județul.");

    if (d.accountType === "COMPANY") {
      if (!d.companyName) issue("companyName", "Scrie denumirea firmei.");
      if (!d.companyCui) issue("companyCui", "Scrie CUI-ul firmei.");
      else if (romania && !isValidRoCui(d.companyCui)) issue("companyCui", "CUI-ul nu este valid. Verifică cifrele.");
      if (!d.companyRegCom) issue("companyRegCom", "Scrie numărul de înregistrare la Registrul Comerțului.");
      if (!d.companyAddress) issue("companyAddress", "Scrie adresa sediului.");
      if (d.companyIban && !isPlausibleIban(d.companyIban)) issue("companyIban", "IBAN-ul nu este valid.");
    }
  });

export type RegistrationData = z.infer<typeof registrationSchema>;

/** Câmpurile goale se țin ca „lipsă" în bază; firma doar la persoana juridică. */
export function registrationToDb(d: RegistrationData) {
  const company = d.accountType === "COMPANY";
  const blank = (v: string | undefined) => (v && v.trim() ? v.trim() : null);
  return {
    accountType: d.accountType,
    firstName: d.firstName,
    lastName: d.lastName,
    name: `${d.firstName} ${d.lastName}`,
    phone: d.phone,
    addressCountry: d.addressCountry,
    addressCounty: blank(d.addressCounty),
    addressCity: d.addressCity,
    addressPostalCode: blank(d.addressPostalCode),
    addressStreet: d.addressStreet,
    companyName: company ? blank(d.companyName) : null,
    companyCui: company ? blank(d.companyCui)?.toUpperCase() ?? null : null,
    companyRegCom: company ? blank(d.companyRegCom)?.toUpperCase() ?? null : null,
    companyAddress: company ? blank(d.companyAddress) : null,
    companyBank: company ? blank(d.companyBank) : null,
    companyIban: company ? blank(d.companyIban)?.replace(/\s/g, "").toUpperCase() ?? null : null,
  };
}
