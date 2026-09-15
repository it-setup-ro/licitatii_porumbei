import { describe, it, expect } from "vitest";
import { isValidRoCui, isPlausibleIban } from "../../src/lib/company";
import { registrationSchema, registrationToDb } from "../../src/lib/registration";
import { countryOptions, RO_COUNTIES, isRomania } from "../../src/lib/regions";
import { fillPlaceholders } from "../../src/lib/legal-placeholders";

describe("CUI românesc", () => {
  it("acceptă CUI-uri cu cifra de control corectă, cu sau fără RO", () => {
    expect(isValidRoCui("44997978")).toBe(true);
    expect(isValidRoCui("RO 44997978")).toBe(true);
  });
  it("respinge o cifră greșită sau litere", () => {
    expect(isValidRoCui("44997979")).toBe(false);
    expect(isValidRoCui("ABC123")).toBe(false);
  });
});

describe("IBAN", () => {
  it("verifică cifrele de control", () => {
    expect(isPlausibleIban("RO49 AAAA 1B31 0075 9384 0000")).toBe(true);
    expect(isPlausibleIban("RO49AAAA1B31007593840001")).toBe(false);
  });
});

const PERSOANA = {
  firstName: "Ionuț",
  lastName: "Burcă",
  nickname: "Burca Ionuț",
  email: "ionut@example.com",
  password: "porumbei-2026",
  phone: "0723 137 787",
  addressCountry: "România",
  addressCounty: "Arad",
  addressCity: "Vladimirescu",
  addressStreet: "Str. Principală 1",
  acceptTerms: true,
};

describe("înregistrarea", () => {
  it("persoana fizică: codul poștal nu e obligatoriu", () => {
    expect(registrationSchema.safeParse(PERSOANA).success).toBe(true);
  });

  it("fără acordul pentru termeni nu se face contul", () => {
    const r = registrationSchema.safeParse({ ...PERSOANA, acceptTerms: false });
    expect(r.success).toBe(false);
  });

  it("în România județul e obligatoriu, în alte țări nu", () => {
    expect(registrationSchema.safeParse({ ...PERSOANA, addressCounty: "" }).success).toBe(false);
    expect(
      registrationSchema.safeParse({ ...PERSOANA, addressCountry: "Germania", addressCounty: "" }).success
    ).toBe(true);
  });

  it("persoana juridică cere denumire, CUI valid, Reg. Com. și sediu; banca și IBAN-ul nu", () => {
    const r = registrationSchema.safeParse({ ...PERSOANA, accountType: "COMPANY" });
    expect(r.success).toBe(false);
    const campuri = r.success ? [] : r.error.issues.map((i) => i.path[0]);
    expect(campuri).toEqual(expect.arrayContaining(["companyName", "companyCui", "companyRegCom", "companyAddress"]));
    expect(campuri).not.toContain("companyBank");
    expect(campuri).not.toContain("companyIban");

    const firma = registrationSchema.safeParse({
      ...PERSOANA,
      accountType: "COMPANY",
      companyName: "Demeco SRL",
      companyCui: "RO44997978",
      companyRegCom: "J02/1756/2021",
      companyAddress: "Arad, Str. Test 2",
    });
    expect(firma.success).toBe(true);
    if (firma.success) {
      const db = registrationToDb(firma.data);
      expect(db.name).toBe("Ionuț Burcă");
      expect(db.companyCui).toBe("RO44997978");
      expect(db.addressPostalCode).toBeNull();
    }
  });

  it("persoana fizică nu păstrează date de firmă trimise din greșeală", () => {
    const r = registrationSchema.safeParse({ ...PERSOANA, companyName: "Rămas din formular" });
    expect(r.success).toBe(true);
    if (r.success) expect(registrationToDb(r.data).companyName).toBeNull();
  });
});

describe("țări și județe", () => {
  it("România și Moldova primele; 42 de județe cu București", () => {
    const tari = countryOptions("ro");
    expect(tari.slice(0, 2)).toEqual(["România", "Republica Moldova"]);
    expect(tari.length).toBeGreaterThan(150);
    expect(RO_COUNTIES).toHaveLength(42);
    expect(isRomania("Romania")).toBe(true);
  });
});

describe("textele legale", () => {
  it("pune datele din Setări și arată ce lipsește", () => {
    const text = fillPlaceholders("Operator: {{firma}}, CUI {{cui}}. {{necunoscut}}", {
      firma: "Demeco SRL",
      cui: "",
    });
    expect(text).toBe("Operator: Demeco SRL, CUI [CUI — de completat în Setări]. {{necunoscut}}");
  });
});
