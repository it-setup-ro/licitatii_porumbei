import { describe, it, expect } from "vitest";
import { absoluteLink, notifValues } from "@/lib/notif-text";
import { notifTranslator } from "@/lib/messages";

/**
 * Clientul a primit „priceCents: 170000" în loc de „1.700 lei", iar linkul nu
 * era apăsabil. Aici se verifică exact ce vede omul în e-mail.
 */
describe("textul notificărilor", () => {
  it("scrie suma pentru om, nu în bani", () => {
    const v = notifValues({ priceCents: 170000 }, "RON", "ro");
    expect(v.price).toBe("1.700 lei");
    expect(notifTranslator("ro")("OUTBID", v as Record<string, string>)).toBe(
      "Oferta ta a fost depășită. Prețul curent: 1.700 lei."
    );
  });

  it("merge și pe suma din comandă (amountCents) și în limba contului", () => {
    const v = notifValues({ amountCents: 170000, lot: "BIBI" }, "RON", "en");
    expect(v.price).toBe("1,700 lei");
    expect(notifTranslator("en")("PAYMENT_INSTRUCTIONS", v as Record<string, string>)).toContain("1,700 lei");
  });

  it("o licitație în euro rămâne în euro, nu în moneda platformei", () => {
    const v = notifValues({ priceCents: 52500, currency: "EUR" }, "RON", "ro");
    expect(v.price).toBe("525 €");
  });

  it("un parametru lipsă nu lasă notificarea fără text", () => {
    const v = notifValues({ priceCents: 50000 }, "RON", "ro");
    expect(notifTranslator("ro")("AUCTION_WON", v as Record<string, string>)).toContain("500 lei");
  });

  it("linkul devine adresă întreagă, cu limba contului", () => {
    expect(absoluteLink("https://exemplu.ro/", "ro", "/auctions/abc")).toBe(
      "https://exemplu.ro/ro/auctions/abc"
    );
    expect(absoluteLink("https://exemplu.ro", "de", "orders/7")).toBe("https://exemplu.ro/de/orders/7");
  });

  it("fără adresa site-ului sau fără link, nu inventează nimic", () => {
    expect(absoluteLink("", "ro", "/auctions/abc")).toBeNull();
    expect(absoluteLink("https://exemplu.ro", "ro", undefined)).toBeNull();
  });

  it("un link care e deja adresă întreagă rămâne cum e", () => {
    expect(absoluteLink("https://exemplu.ro", "ro", "https://alt.ro/pagina")).toBe("https://alt.ro/pagina");
  });
});
