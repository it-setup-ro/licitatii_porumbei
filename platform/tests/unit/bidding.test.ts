import { describe, it, expect } from "vitest";
import {
  computeBid,
  computeExtension,
  incrementFor,
  minimumAcceptableMax,
} from "@/lib/bidding";
import { DEFAULT_SETTINGS } from "@/lib/settings";

const tiers = DEFAULT_SETTINGS.increments;

describe("incrementFor — trepte de pas", () => {
  it("sub 100 EUR: pas 5 EUR", () => expect(incrementFor(5_000, tiers)).toBe(500));
  it("intre 100 si 500: pas 10 EUR", () => expect(incrementFor(20_000, tiers)).toBe(1_000));
  it("exact la granita (500 EUR) trece in treapta urmatoare", () =>
    expect(incrementFor(50_000, tiers)).toBe(2_500));
  it("peste 5000 EUR: pas 100 EUR", () => expect(incrementFor(600_000, tiers)).toBe(10_000));
  it("tiers gol -> fallback", () => expect(incrementFor(1000, [])).toBe(500));
});

describe("minimumAcceptableMax", () => {
  it("fara oferte: minimul e pretul de pornire", () =>
    expect(minimumAcceptableMax(0, false, 20_000, tiers)).toBe(20_000));
  it("cu oferte: pret curent + increment", () =>
    expect(minimumAcceptableMax(20_000, true, 20_000, tiers)).toBe(21_000));
});

describe("computeBid — proxy bidding stil eBay", () => {
  const base = { startPriceCents: 20_000, tiers };

  it("prima oferta sub pretul de pornire e respinsa", () => {
    const r = computeBid({
      ...base,
      bidderId: "A",
      maxCents: 19_999,
      currentPriceCents: 0,
      leader: null,
    });
    expect(r.accepted).toBe(false);
    if (!r.accepted) expect(r.minimumCents).toBe(20_000);
  });

  it("prima oferta valida: pretul vizibil = pretul de pornire, plafonul ramane secret", () => {
    const r = computeBid({
      ...base,
      bidderId: "A",
      maxCents: 50_000,
      currentPriceCents: 0,
      leader: null,
    });
    expect(r.accepted).toBe(true);
    if (r.accepted) {
      expect(r.newPriceCents).toBe(20_000);
      expect(r.newLeader).toEqual({ bidderId: "A", maxCents: 50_000 });
      expect(r.callerIsLeading).toBe(true);
    }
  });

  it("plafon nou mai mic: liderul ramane, pretul urca la newMax + increment", () => {
    const r = computeBid({
      ...base,
      bidderId: "B",
      maxCents: 30_000,
      currentPriceCents: 20_000,
      leader: { bidderId: "A", maxCents: 50_000 },
    });
    expect(r.accepted).toBe(true);
    if (r.accepted) {
      expect(r.newLeader.bidderId).toBe("A");
      expect(r.newPriceCents).toBe(31_000); // 30000 + pas 1000
      expect(r.outbidBidderId).toBe("B");
      expect(r.callerIsLeading).toBe(false);
    }
  });

  it("plafon nou mai mic, dar aproape de plafonul liderului: pretul nu depaseste plafonul liderului", () => {
    const r = computeBid({
      ...base,
      bidderId: "B",
      maxCents: 49_500,
      currentPriceCents: 20_000,
      leader: { bidderId: "A", maxCents: 50_000 },
    });
    expect(r.accepted).toBe(true);
    if (r.accepted) {
      expect(r.newLeader.bidderId).toBe("A");
      expect(r.newPriceCents).toBe(50_000); // min(50000, 49500+1000)
    }
  });

  it("plafon egal: primul venit castiga (liderul ramane)", () => {
    const r = computeBid({
      ...base,
      bidderId: "B",
      maxCents: 50_000,
      currentPriceCents: 20_000,
      leader: { bidderId: "A", maxCents: 50_000 },
    });
    expect(r.accepted).toBe(true);
    if (r.accepted) {
      expect(r.newLeader.bidderId).toBe("A");
      expect(r.newPriceCents).toBe(50_000);
      expect(r.outbidBidderId).toBe("B");
    }
  });

  it("plafon nou mai mare: noul ofertant preia conducerea la oldMax + increment", () => {
    const r = computeBid({
      ...base,
      bidderId: "B",
      maxCents: 80_000,
      currentPriceCents: 20_000,
      leader: { bidderId: "A", maxCents: 50_000 },
    });
    expect(r.accepted).toBe(true);
    if (r.accepted) {
      expect(r.newLeader).toEqual({ bidderId: "B", maxCents: 80_000 });
      expect(r.newPriceCents).toBe(52_500); // 50000 + pas 2500 (treapta 500-1000 EUR)
      expect(r.outbidBidderId).toBe("A");
      expect(r.callerIsLeading).toBe(true);
    }
  });

  it("plafon nou abia peste: pretul nu depaseste plafonul nou", () => {
    const r = computeBid({
      ...base,
      bidderId: "B",
      maxCents: 51_000,
      currentPriceCents: 20_000,
      leader: { bidderId: "A", maxCents: 50_000 },
    });
    expect(r.accepted).toBe(true);
    if (r.accepted) {
      expect(r.newLeader.bidderId).toBe("B");
      expect(r.newPriceCents).toBe(51_000); // min(51000, 50000+2500)
    }
  });

  it("liderul isi ridica plafonul: pretul vizibil nu se schimba", () => {
    const r = computeBid({
      ...base,
      bidderId: "A",
      maxCents: 90_000,
      currentPriceCents: 31_000,
      leader: { bidderId: "A", maxCents: 50_000 },
    });
    expect(r.accepted).toBe(true);
    if (r.accepted) {
      expect(r.newPriceCents).toBe(31_000);
      expect(r.raisedOwnCeiling).toBe(true);
      expect(r.newLeader.maxCents).toBe(90_000);
    }
  });

  it("liderul nu-si poate cobori plafonul", () => {
    const r = computeBid({
      ...base,
      bidderId: "A",
      maxCents: 40_000,
      currentPriceCents: 31_000,
      leader: { bidderId: "A", maxCents: 50_000 },
    });
    expect(r.accepted).toBe(false);
  });

  it("oferta sub minimum (pret curent + increment) e respinsa", () => {
    const r = computeBid({
      ...base,
      bidderId: "B",
      maxCents: 20_500,
      currentPriceCents: 20_000,
      leader: { bidderId: "A", maxCents: 50_000 },
    });
    expect(r.accepted).toBe(false);
    if (!r.accepted) expect(r.minimumCents).toBe(21_000);
  });
});

describe("computeExtension — anti-sniping", () => {
  const base = {
    snipeWindowMinutes: 5,
    extensionMinutes: 5,
    extensionsCount: 0,
    maxExtensions: 50,
  };

  it("oferta in fereastra finala prelungeste cu 5 minute", () => {
    const endsAt = new Date("2026-01-01T17:00:00Z");
    const now = new Date("2026-01-01T16:57:00Z"); // exemplul PIPA din FAQ
    const r = computeExtension({ ...base, now, endsAt });
    expect(r?.toISOString()).toBe("2026-01-01T17:05:00.000Z");
  });

  it("oferta in afara ferestrei nu prelungeste", () => {
    const endsAt = new Date("2026-01-01T17:00:00Z");
    const now = new Date("2026-01-01T16:50:00Z");
    expect(computeExtension({ ...base, now, endsAt })).toBeNull();
  });

  it("licitatie deja incheiata nu se prelungeste", () => {
    const endsAt = new Date("2026-01-01T17:00:00Z");
    const now = new Date("2026-01-01T17:00:01Z");
    expect(computeExtension({ ...base, now, endsAt })).toBeNull();
  });

  it("limita de prelungiri e respectata", () => {
    const endsAt = new Date("2026-01-01T17:00:00Z");
    const now = new Date("2026-01-01T16:59:00Z");
    expect(computeExtension({ ...base, now, endsAt, extensionsCount: 50 })).toBeNull();
  });

  it("prelungirile succesive se acumuleaza", () => {
    let endsAt = new Date("2026-01-01T17:00:00Z");
    // 3 oferte succesive, fiecare in fereastra
    for (let i = 0; i < 3; i++) {
      const now = new Date(endsAt.getTime() - 60_000);
      const next = computeExtension({ ...base, now, endsAt, extensionsCount: i });
      expect(next).not.toBeNull();
      endsAt = next!;
    }
    expect(endsAt.toISOString()).toBe("2026-01-01T17:15:00.000Z");
  });
});
