import { describe, it, expect, afterEach } from "vitest";
import { smtpStatus } from "../../src/lib/smtp-status";

/**
 * Starea trimiterii de e-mailuri, arătată în administrare.
 * Cel mai important: parola nu are voie să iasă de acolo.
 */
const vechi = { url: process.env.SMTP_URL, from: process.env.SMTP_FROM };

afterEach(() => {
  process.env.SMTP_URL = vechi.url;
  process.env.SMTP_FROM = vechi.from;
});

function pune(url?: string, from?: string) {
  if (url === undefined) delete process.env.SMTP_URL;
  else process.env.SMTP_URL = url;
  if (from === undefined) delete process.env.SMTP_FROM;
  else process.env.SMTP_FROM = from;
}

describe("starea e-mailului", () => {
  it("fără configurare, spune limpede că nu e configurat", () => {
    pune(undefined, undefined);
    const s = smtpStatus();
    expect(s.configurat).toBe(false);
    expect(s.host).toBeNull();
  });

  it("recunoaște Brevo și îi spune limita", () => {
    pune("smtp://9a1b%40smtp-brevo.com:cheiaSecreta@smtp-relay.brevo.com:587", "No.1 <a@b.ro>");
    const s = smtpStatus();
    expect(s.configurat).toBe(true);
    expect(s.furnizor).toBe("Brevo");
    expect(s.host).toBe("smtp-relay.brevo.com");
    expect(s.port).toBe(587);
    expect(s.user).toBe("9a1b@smtp-brevo.com");
    expect(s.limita).toContain("300");
    expect(s.expeditor).toBe("No.1 <a@b.ro>");
  });

  it("recunoaște Gmail și avertizează că nu e pentru trimiteri în masă", () => {
    pune("smtp://cineva%40gmail.com:parolaAplicatie@smtp.gmail.com:587");
    const s = smtpStatus();
    expect(s.furnizor).toBe("Gmail");
    expect(s.limita).toMatch(/probe|masă/i);
  });

  it("parola nu iese niciodată din starea arătată în administrare", () => {
    pune("smtp://user:PAROLA_FOARTE_SECRETA@smtp.firma.ro:465", "X <x@firma.ro>");
    const tot = JSON.stringify(smtpStatus());
    expect(tot).not.toContain("PAROLA_FOARTE_SECRETA");
    expect(tot).toContain("smtp.firma.ro");
  });

  it("o adresă scrisă greșit în configurare nu trece drept configurare bună", () => {
    pune("asta nu e o adresă");
    expect(smtpStatus().configurat).toBe(false);
  });
});
