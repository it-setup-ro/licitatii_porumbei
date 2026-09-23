import { describe, it, expect } from "vitest";
import {
  ALERT_EVENTS,
  ALERT_EVENT_KEYS,
  formatAlert,
  isAlertEvent,
  newInviteCode,
  parseEvents,
} from "../../src/lib/alerts";

/**
 * Anunțurile pentru administrator: ce scrie în ele și cine le primește.
 * Partea care se poate verifica fără server — restul se vede în e2e.
 */
describe("anunțuri pentru administrator", () => {
  it("fiecare eveniment are un nume scris în românește", () => {
    expect(ALERT_EVENT_KEYS.length).toBeGreaterThan(0);
    for (const k of ALERT_EVENT_KEYS) {
      expect(ALERT_EVENTS[k].length).toBeGreaterThan(3);
    }
    expect(isAlertEvent("ACCOUNT_PENDING")).toBe(true);
    expect(isAlertEvent("CEVA_INVENTAT")).toBe(false);
  });

  it("lista de evenimente a unui destinatar: ce nu se înțelege înseamnă toate", () => {
    expect(parseEvents(JSON.stringify(["ACCOUNT_PENDING"]))).toEqual(["ACCOUNT_PENDING"]);
    // cheile dispărute între versiuni nu strică restul listei
    expect(parseEvents(JSON.stringify(["ACCOUNT_PENDING", "CEVA_VECHI"]))).toEqual([
      "ACCOUNT_PENDING",
    ]);
    expect(parseEvents(null)).toEqual(ALERT_EVENT_KEYS);
    expect(parseEvents("{stricat")).toEqual(ALERT_EVENT_KEYS);
    // lista goală e o alegere, nu o greșeală: destinatarul nu vrea nimic
    expect(parseEvents("[]")).toEqual([]);
  });

  it("textul spune de la prima linie ce s-a întâmplat și unde se rezolvă", () => {
    const { subject, text } = formatAlert(
      "ACCOUNT_PENDING",
      {
        titlu: "Ion Popescu",
        linii: ["E-mail: ion@exemplu.ro", "Localitate: Arad"],
        cale: "/ro/admin/accounts",
      },
      "http://site.ro"
    );
    expect(subject).toBe("Cerere de cont nou: Ion Popescu");
    expect(text.split("\n")[0]).toBe("Cerere de cont nou: Ion Popescu");
    expect(text).toContain("ion@exemplu.ro");
    expect(text).toContain("http://site.ro/ro/admin/accounts");
  });

  it("fără adresa site-ului rămâne calea, nu un link rupt", () => {
    const { text } = formatAlert("CONTACT_MESSAGE", { titlu: "Întrebare", cale: "/ro/admin/messages" }, null);
    expect(text).toContain("/ro/admin/messages");
    expect(text).not.toContain("http");
  });

  it("codul de invitație nu are caractere care se confundă", () => {
    for (let i = 0; i < 50; i++) {
      const cod = newInviteCode();
      expect(cod).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
    }
  });
});
