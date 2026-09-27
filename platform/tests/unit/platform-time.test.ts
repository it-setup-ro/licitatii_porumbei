import { describe, it, expect } from "vitest";
import { platformFormat, PLATFORM_TZ } from "@/lib/platform-time";

/**
 * Clientul: „am licitat acum și îmi arată 19:55".
 *
 * Ora se scria în fusul mașinii care randa pagina — serverul e cu o oră în
 * urma României. Aici verificăm că aceeași clipă se scrie la fel, oriunde ar
 * rula: 17:55 UTC = 20:55 la București.
 */
const clipa = new Date("2026-09-25T17:55:00Z");

describe("ora platformei", () => {
  it("scrie ora României, nu fusul mașinii", () => {
    expect(platformFormat("ro", { timeStyle: "short" }).format(clipa)).toBe("20:55");
  });

  it("aceeași clipă, în orice limbă, tot ora României", () => {
    expect(platformFormat("de", { timeStyle: "short" }).format(clipa)).toContain("20:55");
    expect(platformFormat("en", { hour: "2-digit", minute: "2-digit", hour12: false }).format(clipa)).toBe(
      "20:55"
    );
  });

  it("merge și cu eticheta scrisă direct, ca la paginile de administrare", () => {
    expect(platformFormat("ro-RO", { timeStyle: "short" }).format(clipa)).toBe("20:55");
  });

  it("un fus cerut anume bate implicitul, pentru cazurile speciale", () => {
    expect(platformFormat("ro", { timeStyle: "short", timeZone: "UTC" }).format(clipa)).toBe("17:55");
  });

  it("la trecerea zilei, data e cea de la București", () => {
    // 22:30 UTC pe 25 = 01:30 pe 26 la București
    const noapte = new Date("2026-09-25T22:30:00Z");
    expect(platformFormat("ro", { dateStyle: "short" }).format(noapte)).toContain("26");
  });

  it("fusul platformei e cel al licitațiilor", () => {
    expect(PLATFORM_TZ).toBe("Europe/Bucharest");
  });
});
