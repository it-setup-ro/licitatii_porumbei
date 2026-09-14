import { describe, it, expect } from "vitest";
import {
  lotLabel,
  missingForStart,
  checkLotStart,
  statusAtStart,
  lotIsLocked,
  salePeriod,
  saleStatus,
  commissionCents,
  buildEndingNotices,
  type PigeonForStart,
  type EndingLot,
} from "../../src/lib/lots";

const complet = (position: number): PigeonForStart => ({
  position,
  ringNumber: `RO 2025 ${100000 + position}`,
  birthYear: 2025,
  sex: "M",
  imageCount: 1,
  startPriceCents: 10_000,
});

const ora = (h: number, m = 0) => new Date(2026, 8, 20, h, m);

describe("numerotarea din lot", () => {
  it("„Lotul 1.01”, cu poziția pe două cifre", () => {
    expect(lotLabel(1, 1)).toBe("1.01");
    expect(lotLabel(1, 20)).toBe("1.20");
    expect(lotLabel(5, 7)).toBe("5.07");
  });
});

describe("ce îi lipsește unui porumbel ca să pornească", () => {
  it("unul complet nu are nimic de completat", () => {
    expect(missingForStart(complet(1))).toEqual([]);
  });

  it("le spune pe toate, nu doar prima", () => {
    expect(
      missingForStart({
        position: 3,
        ringNumber: "",
        birthYear: null,
        sex: null,
        imageCount: 0,
        startPriceCents: 0,
      })
    ).toEqual(["ringNumber", "birthYear", "sex", "photo", "startPrice"]);
  });

  it("fără poză nu pornește — cumpărătorul nu licitează pe nevăzute", () => {
    expect(missingForStart({ ...complet(2), imageCount: 0 })).toEqual(["photo"]);
  });
});

describe("pornirea unui lot", () => {
  const baza = {
    status: "DRAFT",
    startsAt: ora(10),
    endsAt: ora(20),
    now: ora(9),
    maxPigeons: 20,
  };

  it("un lot complet, cu ore bune, pornește", () => {
    expect(checkLotStart({ ...baza, pigeons: [1, 2, 3].map(complet) })).toEqual([]);
  });

  it("merge cu 4, 8, 15 sau 20 de porumbei", () => {
    for (const n of [4, 8, 15, 20]) {
      const pigeons = Array.from({ length: n }, (_, i) => complet(i + 1));
      expect(checkLotStart({ ...baza, pigeons }), `${n} porumbei`).toEqual([]);
    }
  });

  it("21 de porumbei nu intră într-un lot", () => {
    const pigeons = Array.from({ length: 21 }, (_, i) => complet(i + 1));
    expect(checkLotStart({ ...baza, pigeons })).toEqual([{ code: "TOO_MANY", max: 20, count: 21 }]);
  });

  it("un lot gol nu pornește", () => {
    expect(checkLotStart({ ...baza, pigeons: [] })).toEqual([{ code: "EMPTY" }]);
  });

  it("sfârșitul trebuie să fie după început", () => {
    const r = checkLotStart({ ...baza, endsAt: ora(10), pigeons: [complet(1)] });
    expect(r).toContainEqual({ code: "END_BEFORE_START" });
  });

  it("un lot al cărui final a trecut nu pornește", () => {
    const r = checkLotStart({ ...baza, now: ora(21), pigeons: [complet(1)] });
    expect(r).toContainEqual({ code: "ENDS_IN_PAST" });
  });

  it("un lot deja pornit nu se pornește a doua oară", () => {
    const r = checkLotStart({ ...baza, status: "LIVE", pigeons: [complet(1)] });
    expect(r).toContainEqual({ code: "NOT_DRAFT", status: "LIVE" });
  });

  it("spune exact la care porumbel lipsește ceva, în ordinea din lot", () => {
    const r = checkLotStart({
      ...baza,
      pigeons: [complet(1), { ...complet(7), imageCount: 0 }, { ...complet(3), sex: null }],
    });
    expect(r).toEqual([
      {
        code: "INCOMPLETE",
        pigeons: [
          { position: 3, missing: ["sex"] },
          { position: 7, missing: ["photo"] },
        ],
      },
    ]);
  });

  it("ora de început trecută pornește acum; una viitoare așteaptă", () => {
    expect(statusAtStart(ora(10), ora(10))).toBe("LIVE");
    expect(statusAtStart(ora(10), ora(11))).toBe("LIVE");
    expect(statusAtStart(ora(12), ora(11))).toBe("SCHEDULED");
  });
});

describe("„o dată începută, rămâne începută”", () => {
  it("ciorna se poate schimba", () => {
    expect(lotIsLocked("DRAFT", ora(10), ora(11))).toBe(false);
  });

  it("un lot programat se mai poate schimba până la ora de început", () => {
    expect(lotIsLocked("SCHEDULED", ora(12), ora(11))).toBe(false);
  });

  it("de la ora de început e blocat, chiar dacă trecerea la LIVE n-a rulat încă", () => {
    expect(lotIsLocked("SCHEDULED", ora(12), ora(12))).toBe(true);
  });

  it("activ sau închis — blocat", () => {
    expect(lotIsLocked("LIVE", ora(10), ora(11))).toBe(true);
    expect(lotIsLocked("CLOSED", ora(10), ora(22))).toBe(true);
  });
});

describe("licitația crescătorului", () => {
  it("perioada vine din loturi: primul început, ultimul sfârșit", () => {
    const p = salePeriod([
      { status: "LIVE", startsAt: ora(10), endsAt: ora(20) },
      { status: "SCHEDULED", startsAt: ora(12), endsAt: ora(22) },
    ]);
    expect(p).toEqual({ startsAt: ora(10), endsAt: ora(22) });
  });

  it("loturile în ciornă nu lungesc perioada", () => {
    const p = salePeriod([
      { status: "LIVE", startsAt: ora(10), endsAt: ora(20) },
      { status: "DRAFT", startsAt: ora(8), endsAt: ora(23) },
    ]);
    expect(p).toEqual({ startsAt: ora(10), endsAt: ora(20) });
  });

  it("fără niciun lot pornit, nu are perioadă", () => {
    expect(salePeriod([{ status: "DRAFT", startsAt: ora(10), endsAt: ora(20) }])).toBeNull();
  });

  it("starea: activă dacă un lot curge, apoi programată, apoi încheiată", () => {
    expect(saleStatus([{ status: "CLOSED" }, { status: "LIVE" }])).toBe("LIVE");
    expect(saleStatus([{ status: "CLOSED" }, { status: "SCHEDULED" }])).toBe("UPCOMING");
    expect(saleStatus([{ status: "CLOSED" }, { status: "DRAFT" }])).toBe("CLOSED");
    expect(saleStatus([{ status: "DRAFT" }])).toBe("DRAFT");
    expect(saleStatus([])).toBe("DRAFT");
  });

  it("comisionul, cu procentele pe care le folosește clientul", () => {
    expect(commissionCents(320_000, 15)).toBe(48_000);
    expect(commissionCents(100_000, 23)).toBe(23_000);
    expect(commissionCents(99_999, 16)).toBe(16_000);
  });
});

describe("avizul „se încheie în 30 de minute”", () => {
  const lot = (id: string, number: number, h: number, pigeons: EndingLot["pigeons"]): EndingLot => ({
    lotId: id,
    lotNumber: number,
    saleSlug: "burca-ionut",
    saleTitle: "Licitația Burca Ionuț",
    breederName: "Burca Ionuț",
    endsAt: ora(h),
    pigeons,
  });

  const lot1 = lot("L1", 1, 20, [
    { auctionId: "a1", position: 1, name: "Fulger", priceCents: 30_000, leaderId: "ana", bidderIds: ["ana", "dan"] },
    { auctionId: "a2", position: 2, name: "Perla", priceCents: 12_000, leaderId: "dan", bidderIds: ["dan"] },
  ]);
  const lot2 = lot("L2", 2, 20, [
    { auctionId: "b1", position: 1, name: "Vânt", priceCents: 50_000, leaderId: "ana", bidderIds: ["ana"] },
  ]);

  it("un singur e-mail pe om, oricâte loturi s-ar închide", () => {
    const notices = buildEndingNotices([lot1, lot2], ["ana", "dan", "ion"]);
    const perOm = notices.map((n) => n.userId);
    expect(perOm).toEqual(["ana", "dan", "ion"]);
  });

  it("cine a licitat își vede porumbeii și dacă e pe primul loc", () => {
    const [ana, dan] = buildEndingNotices([lot1, lot2], []);
    expect(ana).toMatchObject({ kind: "BIDDER" });
    expect(ana.kind === "BIDDER" && ana.mine).toEqual([
      { auctionId: "a1", label: "1.01", name: "Fulger", priceCents: 30_000, leading: true },
      { auctionId: "b1", label: "2.01", name: "Vânt", priceCents: 50_000, leading: true },
    ]);
    expect(dan.kind === "BIDDER" && dan.mine.map((m) => [m.label, m.leading])).toEqual([
      ["1.01", false],
      ["1.02", true],
    ]);
  });

  it("cine a licitat nu primește și e-mailul general", () => {
    const notices = buildEndingNotices([lot1], ["dan"]);
    expect(notices.filter((n) => n.userId === "dan")).toHaveLength(1);
    expect(notices[1] ?? notices[0]).toMatchObject({ userId: "dan", kind: "BIDDER" });
  });

  it("cine n-a licitat primește e-mailul general doar dacă l-a ales", () => {
    const notices = buildEndingNotices([lot1], ["ion"]);
    expect(notices.find((n) => n.userId === "ion")).toMatchObject({ kind: "GENERAL" });
    expect(notices.find((n) => n.userId === "maria")).toBeUndefined();
  });

  it("fără loturi, niciun e-mail", () => {
    expect(buildEndingNotices([], ["ion"])).toEqual([]);
  });
});
