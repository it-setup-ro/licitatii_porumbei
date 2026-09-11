import { describe, it, expect } from "vitest";
import { normalizeSearch, DIACRITICE_DIN, DIACRITICE_IN } from "../../src/lib/search";

describe("normalizarea căutării", () => {
  it("coboară la litere mici", () => {
    expect(normalizeSearch("CUCA")).toBe("cuca");
  });

  it("scoate diacriticele românești", () => {
    expect(normalizeSearch("NIȚĂ")).toBe("nita");
    expect(normalizeSearch("Săgeata Albă")).toBe("sageata alba");
    expect(normalizeSearch("Vânt de Vest")).toBe("vant de vest");
  });

  it("merge și cu ș/ț scrise cu sedilă (tastaturile vechi)", () => {
    // ş U+015F și ţ U+0163 — alte caractere decât ș U+0219 și ț U+021B
    expect(normalizeSearch("NIŢĂ")).toBe("nita");
    expect(normalizeSearch("Şoim")).toBe("soim");
  });

  it("taie spațiile de la capete, dar le păstrează pe cele din interior", () => {
    expect(normalizeSearch("  CUCA lui NIȚĂ  ")).toBe("cuca lui nita");
  });

  it("numele străine rămân căutabile fără accente", () => {
    expect(normalizeSearch("Hérbots")).toBe("herbots");
    expect(normalizeSearch("Müller")).toBe("muller");
  });

  it("cifrele și seria inelului trec neatinse", () => {
    expect(normalizeSearch("RO 2024 550077")).toBe("ro 2024 550077");
  });

  it("tabelul de traducere are aceeași lungime pe ambele coloane", () => {
    // daca nu, Postgres ar taia literele fara pereche si cautarea ar minti
    expect([...DIACRITICE_DIN].length).toBe([...DIACRITICE_IN].length);
  });
});
