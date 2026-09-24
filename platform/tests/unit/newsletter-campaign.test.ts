import { describe, it, expect } from "vitest";
import { composeEmail } from "../../src/lib/newsletter-campaign";

/**
 * Mesajul care pleacă la un abonat: în limba lui, cu link de dezabonare.
 * Linkul e obligatoriu — fără el, mesajul e spam, indiferent cine l-a cerut.
 */
const CAMPANIE = {
  subjectRo: "Licitație nouă sâmbătă",
  subjectEn: "New auction on Saturday",
  bodyRo: "Sâmbătă pornim licitația crescătorului X. Te așteptăm!",
  bodyEn: "On Saturday we open breeder X's auction. See you there!",
};

describe("mesajul de newsletter", () => {
  it("merge în limba abonatului", () => {
    const ro = composeEmail(CAMPANIE, { locale: "ro", unsubToken: "abc" }, "http://site.ro");
    expect(ro.subject).toBe("Licitație nouă sâmbătă");
    expect(ro.text).toContain("Te așteptăm");

    const en = composeEmail(CAMPANIE, { locale: "en", unsubToken: "abc" }, "http://site.ro");
    expect(en.subject).toBe("New auction on Saturday");
    expect(en.text).toContain("See you there");
  });

  it("o limbă fără traducere proprie primește engleza, nu româna", () => {
    const de = composeEmail(CAMPANIE, { locale: "de", unsubToken: "abc" }, "http://site.ro");
    expect(de.subject).toBe("New auction on Saturday");
  });

  it("are întotdeauna linkul de dezabonare, cu jetonul omului", () => {
    const ro = composeEmail(CAMPANIE, { locale: "ro", unsubToken: "jeton-123" }, "http://site.ro");
    expect(ro.text).toContain("http://site.ro/ro/newsletter/unsubscribe?token=jeton-123");
    expect(ro.text).toMatch(/dezabonez/i);

    const en = composeEmail(CAMPANIE, { locale: "en", unsubToken: "jeton-123" }, "http://site.ro");
    expect(en.text).toContain("/en/newsletter/unsubscribe?token=jeton-123");
    expect(en.text).toMatch(/unsubscribe/i);
  });

  it("fără adresa site-ului rămâne calea, nu un link rupt", () => {
    const ro = composeEmail(CAMPANIE, { locale: "ro", unsubToken: "x" }, null);
    expect(ro.text).toContain("/ro/newsletter/unsubscribe?token=x");
    expect(ro.text).not.toContain("http");
  });

  it("jetonul unui abonat nu ajunge în mesajul altuia", () => {
    const a = composeEmail(CAMPANIE, { locale: "ro", unsubToken: "AAA" }, null);
    const b = composeEmail(CAMPANIE, { locale: "ro", unsubToken: "BBB" }, null);
    expect(a.text).not.toContain("BBB");
    expect(b.text).not.toContain("AAA");
  });
});
