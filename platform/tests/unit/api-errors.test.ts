import { describe, it, expect } from "vitest";
import { isJsonParseError } from "../../src/lib/api";

/**
 * O cerere fără corp JSON trebuie să iasă ca greșeală a celui care cheamă ruta,
 * nu ca defecțiune a serverului. Prins pe viu: ascunderea unei licitații de test
 * a răspuns „INTERNAL" 500 doar pentru că cererea plecase goală.
 */
describe("erori de corp JSON", () => {
  it("recunoaște corpul gol și pe cel stricat", () => {
    expect(isJsonParseError(new SyntaxError("Unexpected end of JSON input"))).toBe(true);
    expect(isJsonParseError(new SyntaxError('Unexpected token < in JSON at position 0'))).toBe(true);
  });

  it("nu confundă alte erori cu una de corp", () => {
    expect(isJsonParseError(new Error("Unexpected end of JSON input"))).toBe(false);
    expect(isJsonParseError(new SyntaxError("invalid regular expression"))).toBe(false);
    expect(isJsonParseError(null)).toBe(false);
    expect(isJsonParseError("JSON")).toBe(false);
  });
});
