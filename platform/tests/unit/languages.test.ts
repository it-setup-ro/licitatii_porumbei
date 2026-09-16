import { describe, it, expect } from "vitest";
import de from "../../messages/de.json";
import ar from "../../messages/ar.json";
import { paymentInstructionsText } from "../../src/lib/payment-instructions";
import { formatMoney } from "../../src/lib/money";
import { countryOptions, isRomania } from "../../src/lib/regions";
import { consentTextFor } from "../../src/lib/newsletter";
import { intlLocale, localeDir, normalizeLocale, pick } from "../../src/lib/locales";
import { emailTranslator } from "../../src/lib/messages";

/** Cele 13 limbi: e-mailurile pleacă în limba contului, conținutul adminului cade pe engleză. */

const plata = {
  won: true,
  pigeon: "Albastrul",
  label: "1.04",
  ring: "RO 2025 123456",
  amountCents: 120_900,
  currency: "RON",
  eurRate: 5.2567,
  details: { companyName: "Demeco SRL", iban: "RO49AAAA1B31007593840000", bank: "", phone: "0740 000 000" },
  orderUrl: "https://site/de/orders/abc",
};

describe("limbile site-ului", () => {
  it("e-mailul cu datele de plată e în germană pentru un cont în germană", () => {
    const text = paymentInstructionsText({ ...plata, locale: "de" });
    expect(text.startsWith(de.email.hello)).toBe(true);
    expect(text).toContain(de.email.payment.rule);
    expect(text).toContain("RO 2025 123456");
    expect(text).toContain("RO49AAAA1B31007593840000");
    expect(text).not.toContain("Felicitări");
  });

  it("o limbă necunoscută în cont cade pe română", () => {
    expect(normalizeLocale("xx")).toBe("ro");
    expect(paymentInstructionsText({ ...plata, locale: "xx" })).toContain("Porumbeii se predau după plată.");
  });

  it("subiectele notificărilor există în toate limbile", () => {
    for (const l of ["zh", "ja", "nl", "fr", "de", "es", "pl", "ar", "hi", "gu", "sw"]) {
      const subject = emailTranslator(l)("subjects.AUCTION_WON");
      expect(subject.length).toBeGreaterThan(3);
      expect(subject).not.toContain("subjects.");
    }
    expect(emailTranslator("ar")("subjects.OUTBID")).toBe(ar.email.subjects.OUTBID);
  });

  it("bifa de acord se păstrează în limba în care a fost citită", () => {
    expect(consentTextFor("de")).toBe(de.email.consentText);
    expect(consentTextFor("ro")).toContain("Sunt de acord");
  });

  it("sumele: lei la final peste tot, euro după obiceiul limbii", () => {
    expect(formatMoney(150_000, "RON", "de")).toBe("1.500 lei");
    expect(formatMoney(57_500, "EUR", "de")).toBe("575 €");
    expect(formatMoney(57_500, "EUR", "ja")).toBe("€575");
    // araba păstrează cifrele latine
    expect(formatMoney(150_000, "RON", "ar")).toMatch(/^1[,.٬]?500 lei$/);
  });

  it("România e recunoscută în orice limbă, ca județul să fie cerut", () => {
    const tari = countryOptions("de");
    expect(tari[0]).toBe("Rumänien");
    expect(isRomania("Rumänien")).toBe(true);
    expect(isRomania("Roumanie")).toBe(true);
    expect(isRomania("Moldova")).toBe(false);
  });

  it("conținutul scris de admin: română doar pentru română, altfel engleză", () => {
    expect(pick("ro", "Titlu", "Title")).toBe("Titlu");
    expect(pick("ja", "Titlu", "Title")).toBe("Title");
    expect(pick("ja", "Titlu", "")).toBe("Titlu");
    expect(localeDir("ar")).toBe("rtl");
    expect(intlLocale("zh")).toBe("zh-CN");
  });
});
