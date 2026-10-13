import { describe, it, expect } from "vitest";
import { parseBreederResults } from "@/lib/breeder-results";

/**
 * Macheta clientului cere rezultatele aliniate pe coloane: locul, cursa, anul.
 * Se scriu tot într-o casetă, despărțite cu bară, iar rândurile vechi, scrise
 * liber, rămân cum sunt — nu se pierde nimic.
 */
describe("rezultatele crescătorului", () => {
  it("desparte locul, cursa și anul", () => {
    expect(parseBreederResults("Loc 1 | Maraton – Berlin | 2025")).toEqual([
      { place: "Loc 1", race: "Maraton – Berlin", year: "2025" },
    ]);
  });

  it("ia rândurile pe rând și sare peste cele goale", () => {
    const r = parseBreederResults("Loc 1 | Berlin | 2025\n\n  \nLoc 2 | Nordhausen | 2024");
    expect(r).toHaveLength(2);
    expect(r[1]).toEqual({ place: "Loc 2", race: "Nordhausen", year: "2024" });
  });

  it("cu două bucăți, anul lipsește, nu se inventează", () => {
    expect(parseBreederResults("Loc 3 | AS Maraton Arad")).toEqual([
      { place: "Loc 3", race: "AS Maraton Arad", year: null },
    ]);
  });

  it("un rând scris liber își dă măcar anul de la sfârșit", () => {
    expect(parseBreederResults("Campion național fond 2023")).toEqual([
      { place: null, race: "Campion național fond", year: "2023" },
    ]);
  });

  it("un rând fără an rămâne întreg", () => {
    expect(parseBreederResults("Crescător de referință zona Arad")).toEqual([
      { place: null, race: "Crescător de referință zona Arad", year: null },
    ]);
  });

  it("fără text, nicio linie", () => {
    expect(parseBreederResults(null)).toEqual([]);
    expect(parseBreederResults("   ")).toEqual([]);
  });

  it("un număr care nu e an rămâne în text", () => {
    expect(parseBreederResults("Locul 5 din 120")).toEqual([
      { place: null, race: "Locul 5 din 120", year: null },
    ]);
  });
});
