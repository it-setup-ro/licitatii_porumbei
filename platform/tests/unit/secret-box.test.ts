import { describe, it, expect, beforeAll } from "vitest";
import { openSecret, sealSecret } from "../../src/lib/secret-box";

/**
 * Parola serviciului de e-mail, scrisă din administrare, stă criptată în baza
 * de date. Cheia se face din AUTH_SECRET, care e doar pe server: o copie a
 * bazei, singură, nu descuie nimic.
 */
beforeAll(() => {
  process.env.AUTH_SECRET = process.env.AUTH_SECRET ?? "secret-de-test-suficient-de-lung";
});

describe("secrete păstrate în baza de date", () => {
  it("se încuie și se descuie la loc", () => {
    const parola = "parola-de-aplicatie-google";
    const cutie = sealSecret(parola);
    expect(cutie).not.toContain(parola);
    expect(openSecret(cutie)).toBe(parola);
  });

  it("de fiecare dată iese altfel, deși parola e aceeași", () => {
    expect(sealSecret("aceeasi")).not.toBe(sealSecret("aceeasi"));
  });

  it("dacă cineva umblă la conținut, nu se descuie", () => {
    const cutie = sealSecret("parola");
    const stricata = cutie.slice(0, -2) + (cutie.endsWith("A") ? "B" : "A");
    expect(openSecret(stricata)).toBeNull();
  });

  it("o cutie scrisă aiurea nu dărâmă nimic", () => {
    expect(openSecret("nu e o cutie")).toBeNull();
    expect(openSecret("")).toBeNull();
  });

  it("fără cheia de pe server nu se încuie nimic", () => {
    const vechi = process.env.AUTH_SECRET;
    process.env.AUTH_SECRET = "";
    expect(() => sealSecret("parola")).toThrow(/AUTH_SECRET/);
    process.env.AUTH_SECRET = vechi;
  });
});
