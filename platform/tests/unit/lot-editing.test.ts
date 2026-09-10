import { describe, it, expect } from "vitest";
import {
  editScope,
  needsReapproval,
  changedFields,
  appendNote,
} from "../../src/lib/lot-editing";
import { computeBid, reserveState } from "../../src/lib/bidding";

describe("cine poate modifica un lot", () => {
  it("crescătorul schimbă orice cât timp lotul e în așteptare sau respins", () => {
    expect(editScope({ status: "PENDING_APPROVAL", bidCount: 0 }, false)).toBe("FULL");
    expect(editScope({ status: "REJECTED", bidCount: 0 }, false)).toBe("FULL");
  });

  it("un lot programat sau activ FĂRĂ oferte se poate încă schimba complet", () => {
    expect(editScope({ status: "SCHEDULED", bidCount: 0 }, false)).toBe("FULL");
    expect(editScope({ status: "LIVE", bidCount: 0 }, false)).toBe("FULL");
  });

  it("din prima ofertă rămân doar completările", () => {
    expect(editScope({ status: "LIVE", bidCount: 1 }, false)).toBe("ADDITIONS_ONLY");
    expect(editScope({ status: "LIVE", bidCount: 40 }, false)).toBe("ADDITIONS_ONLY");
  });

  it("un lot închis nu se mai atinge", () => {
    expect(editScope({ status: "CLOSED", bidCount: 5 }, false)).toBe("NONE");
    expect(editScope({ status: "CANCELLED", bidCount: 0 }, false)).toBe("NONE");
  });

  it("adminul poate corecta orice, inclusiv un lot închis", () => {
    expect(editScope({ status: "CLOSED", bidCount: 12 }, true)).toBe("FULL");
    expect(editScope({ status: "LIVE", bidCount: 3 }, true)).toBe("FULL");
  });
});

describe("când se cere din nou aprobarea", () => {
  it("schimbarea seriei sau a prețului scoate lotul din public", () => {
    expect(needsReapproval({ status: "LIVE", bidCount: 0 }, ["ringNumber"], false)).toBe(true);
    expect(needsReapproval({ status: "SCHEDULED", bidCount: 0 }, ["startPriceCents"], false)).toBe(
      true
    );
    expect(needsReapproval({ status: "LIVE", bidCount: 0 }, ["sex"], false)).toBe(true);
    expect(needsReapproval({ status: "LIVE", bidCount: 0 }, ["birthYear"], false)).toBe(true);
  });

  it("o corectură de text sau o poză în plus nu opresc licitația", () => {
    expect(needsReapproval({ status: "LIVE", bidCount: 0 }, ["descRo", "media"], false)).toBe(
      false
    );
    expect(needsReapproval({ status: "LIVE", bidCount: 0 }, ["taglineRo"], false)).toBe(false);
  });

  it("un lot care oricum așteaptă aprobarea nu se „retrimite” a doua oară", () => {
    expect(needsReapproval({ status: "PENDING_APPROVAL", bidCount: 0 }, ["ringNumber"], false)).toBe(
      false
    );
  });

  it("modificările adminului nu trec prin aprobare — el e aprobatorul", () => {
    expect(needsReapproval({ status: "LIVE", bidCount: 0 }, ["ringNumber"], true)).toBe(false);
  });
});

describe("ce s-a schimbat", () => {
  it("compară ca text, ca să nu conteze 120 față de „120”", () => {
    expect(changedFields({ a: 120, b: "x" }, { a: "120", b: "y" })).toEqual(["b"]);
  });

  it("null și șir gol înseamnă același lucru", () => {
    expect(changedFields({ a: null }, { a: "" })).toEqual([]);
  });

  it("un câmp apărut din nimic se numără", () => {
    expect(changedFields({}, { nou: "ceva" })).toEqual(["nou"]);
  });
});

describe("completarea descrierii", () => {
  const when = new Date(2026, 2, 9); // 9 martie 2026

  it("se adaugă datată, sub textul existent", () => {
    expect(appendNote("Text vechi.", "A mai câștigat o cursă.", when)).toBe(
      "Text vechi.\n\n— Completare 09.03.2026: A mai câștigat o cursă."
    );
  });

  it("textul vechi rămâne neatins", () => {
    const vechi = "Are o unghie ruptă la piciorul stâng.";
    expect(appendNote(vechi, "Altceva", when)).toContain(vechi);
  });

  it("merge și pe un lot fără descriere", () => {
    expect(appendNote(null, "Prima notă", when)).toBe("— Completare 09.03.2026: Prima notă");
    expect(appendNote("   ", "Prima notă", when)).toBe("— Completare 09.03.2026: Prima notă");
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Pretul de rezerva
// ─────────────────────────────────────────────────────────────────────────

describe("prețul de rezervă", () => {
  it("fără rezervă, nu se afișează nimic", () => {
    expect(reserveState(null, 50_000)).toBe("NONE");
  });

  it("sub prag: neatins", () => {
    expect(reserveState(60_000, 45_000)).toBe("NOT_MET");
  });

  it("exact la prag: atins — pragul se include", () => {
    expect(reserveState(60_000, 60_000)).toBe("MET");
  });

  it("peste prag: atins", () => {
    expect(reserveState(60_000, 72_500)).toBe("MET");
  });

  it("suma nu iese niciodată din funcție — doar starea", () => {
    const stare = reserveState(999_999, 1_000);
    expect(["NONE", "MET", "NOT_MET"]).toContain(stare);
    expect(JSON.stringify(stare)).not.toContain("999");
  });
});

describe("prețul urcă la rezervă când plafonul o acoperă", () => {
  const tiers = [{ upToCents: null, stepCents: 1_000 }];

  it("prima ofertă cu plafon peste rezervă duce prețul la rezervă", () => {
    const out = computeBid({
      bidderId: "a",
      maxCents: 45_000,
      startPriceCents: 12_000,
      currentPriceCents: 12_000,
      leader: null,
      tiers,
      reserveCents: 40_000,
    });
    expect(out.accepted).toBe(true);
    if (out.accepted) expect(out.newPriceCents).toBe(40_000);
  });

  it("plafon sub rezervă: prețul rămâne unde e, rezerva neatinsă", () => {
    const out = computeBid({
      bidderId: "a",
      maxCents: 30_000,
      startPriceCents: 12_000,
      currentPriceCents: 12_000,
      leader: null,
      tiers,
      reserveCents: 40_000,
    });
    expect(out.accepted).toBe(true);
    if (out.accepted) expect(out.newPriceCents).toBe(12_000);
  });

  it("fără rezervă, nimic nu se schimbă", () => {
    const out = computeBid({
      bidderId: "a",
      maxCents: 45_000,
      startPriceCents: 12_000,
      currentPriceCents: 12_000,
      leader: null,
      tiers,
      reserveCents: null,
    });
    if (out.accepted) expect(out.newPriceCents).toBe(12_000);
  });

  it("nu sare peste rezervă mai mult decât trebuie", () => {
    const out = computeBid({
      bidderId: "b",
      maxCents: 100_000,
      startPriceCents: 12_000,
      currentPriceCents: 12_000,
      leader: { bidderId: "a", maxCents: 20_000 },
      tiers,
      reserveCents: 40_000,
    });
    // ar fi urcat la 21.000 fara rezerva; cu rezerva, exact la 40.000
    if (out.accepted) expect(out.newPriceCents).toBe(40_000);
  });
});
