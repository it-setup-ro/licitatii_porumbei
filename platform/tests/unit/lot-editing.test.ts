import { describe, it, expect } from "vitest";
import {
  editScope,
  needsReapproval,
  changedFields,
  appendNote,
} from "../../src/lib/lot-editing";

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
