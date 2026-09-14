import { describe, it, expect } from "vitest";
import { nicknameSchema } from "../../src/lib/nickname";

/**
 * Cererea clientului: porecla e liberă — „poreclă / nume / cod".
 */

const ok = (s: string) => nicknameSchema.safeParse(s).success;

describe("porecla ofertantului", () => {
  it("merge o poreclă scurtă, un nume cu spațiu, un cod", () => {
    expect(ok("Ionuț")).toBe(true);
    expect(ok("Burca Ionuț")).toBe(true);
    expect(ok("RO-448")).toBe(true);
    expect(ok("AB")).toBe(true);
  });

  it("merge cu diacritice și cu punct", () => {
    expect(ok("Ștefan C.")).toBe(false); // se termină cu punct
    expect(ok("Ștefan C")).toBe(true);
    expect(ok("Crescătoria Mureș")).toBe(true);
  });

  it("spațiile de la capete se taie singure", () => {
    const r = nicknameSchema.safeParse("  Ionuț  ");
    expect(r.success && r.data).toBe("Ionuț");
  });

  it("prea scurt sau prea lung nu", () => {
    expect(ok("I")).toBe(false);
    expect(ok("a".repeat(31))).toBe(false);
    expect(ok("a".repeat(30))).toBe(true);
  });

  it("nu începe și nu se termină cu semne", () => {
    expect(ok("-Ionut")).toBe(false);
    expect(ok("Ionut_")).toBe(false);
  });

  it("două spații la rând nu — ar arăta ca două nume diferite", () => {
    expect(ok("Burca  Ionut")).toBe(false);
  });

  it("fără caractere care n-au ce căuta într-un nume", () => {
    expect(ok("Ionut<script>")).toBe(false);
    expect(ok("ion@mail")).toBe(false);
  });
});
