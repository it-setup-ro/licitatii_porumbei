import { describe, it, expect } from "vitest";
import { outbidSubject, outbidText, type OutbidData } from "@/lib/outbid-email";

/**
 * Cererea clientului: omul care licitează la mai mulți porumbei trebuie să vadă
 * din mesaj LA CARE a fost depășit și să ajungă acolo dintr-un clic.
 */
const de: OutbidData = {
  locale: "ro",
  pigeon: "BIBI",
  ring: "RO-25-123456",
  lotLabel: "1.04",
  sale: "Licitația GORCEA PETRU",
  currency: "RON",
  priceCents: 170000,
  yourMaxCents: 150000,
  minNextCents: 175000,
  endsAt: new Date("2026-09-25T18:00:00Z"), // 21:00, ora României
  url: "https://exemplu.ro/ro/auctions/abc",
};

describe("e-mailul de depășire", () => {
  it("subiectul spune porumbelul și lotul", () => {
    expect(outbidSubject(de)).toBe("Ai fost depășit la BIBI — Lotul 1.04");
  });

  it("textul are porumbelul, seria, lotul, licitația, sumele și ora închiderii", () => {
    const t = outbidText(de);
    expect(t).toContain("Ai fost depășit la BIBI (RO-25-123456), Lotul 1.04 din Licitația GORCEA PETRU.");
    expect(t).toContain("Prețul curent: 1.700 lei");
    expect(t).toContain("Tu ai licitat până la: 1.500 lei");
    expect(t).toContain("Ca să reiei conducerea: minimum 1.750 lei");
    expect(t).toContain("21:00"); // ora platformei, nu ora serverului
    expect(t).toContain("https://exemplu.ro/ro/auctions/abc");
  });

  it("un porumbel din afara loturilor nu inventează un lot", () => {
    const t = outbidText({ ...de, lotLabel: null, sale: null });
    expect(t).toContain("Ai fost depășit la BIBI (RO-25-123456).");
    expect(t).not.toContain("Lotul");
    expect(outbidSubject({ ...de, lotLabel: null })).toBe("Ai fost depășit la BIBI");
  });

  it("fără serie de inel nu rămâne o paranteză goală", () => {
    expect(outbidText({ ...de, ring: null })).toContain("Ai fost depășit la BIBI, Lotul 1.04");
    expect(outbidText({ ...de, ring: "  " })).not.toContain("()");
  });

  it("dacă nu licitase el (l-a depășit de la prima ofertă), nu scrie plafonul", () => {
    const t = outbidText({ ...de, yourMaxCents: 0 });
    expect(t).not.toContain("Tu ai licitat");
    expect(t).toContain("Prețul curent: 1.700 lei");
  });

  it("merge în limba contului", () => {
    const t = outbidText({ ...de, locale: "en" });
    expect(t).toContain("You have been outbid on BIBI (RO-25-123456), Lot 1.04");
    expect(t).toContain("Current price: 1,700 lei");
  });
});
