import { describe, it, expect } from "vitest";
import { buyerForBreeder } from "@/lib/breeder-view";

/**
 * Regula hotărâtă cu Daniel: până la plată, crescătorul vede doar aliasul;
 * după plată, numele și localitatea. Telefonul și adresa nu apar niciodată.
 */
const cumparator = {
  name: "Ion Popescu",
  nickname: "Peex",
  addressCity: "Arad",
  addressCountry: "România",
};

describe("ce vede crescătorul despre cumpărător", () => {
  it("până la plată, doar aliasul", () => {
    const v = buyerForBreeder({ status: "PENDING_PAYMENT", buyer: cumparator });
    expect(v).toEqual({ label: "Peex", locality: null, revealed: false });
  });

  it("după plată, numele și localitatea", () => {
    const v = buyerForBreeder({ status: "PAID", buyer: cumparator });
    expect(v).toEqual({ label: "Ion Popescu", locality: "Arad, România", revealed: true });
  });

  it("predarea și expedierea sunt tot stări plătite", () => {
    for (const status of ["SHIPPED", "DELIVERED"]) {
      expect(buyerForBreeder({ status, buyer: cumparator }).revealed).toBe(true);
    }
  });

  it("o comandă anulată nu deschide numele", () => {
    const v = buyerForBreeder({ status: "CANCELLED", buyer: cumparator });
    expect(v.revealed).toBe(false);
    expect(v.label).toBe("Peex");
  });

  it("fără alias, o liniuță — nu numele real", () => {
    const v = buyerForBreeder({
      status: "PENDING_PAYMENT",
      buyer: { ...cumparator, nickname: null },
    });
    expect(v.label).toBe("—");
    expect(v.label).not.toContain("Popescu");
  });

  it("fără localitate scrisă, rămâne doar numele", () => {
    const v = buyerForBreeder({
      status: "PAID",
      buyer: { ...cumparator, addressCity: null, addressCountry: "  " },
    });
    expect(v.label).toBe("Ion Popescu");
    expect(v.locality).toBeNull();
  });
});
