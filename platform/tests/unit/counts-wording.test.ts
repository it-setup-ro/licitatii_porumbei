import { describe, it, expect } from "vitest";
import IntlMessageFormat from "intl-messageformat";
import ro from "../../messages/ro.json";
import en from "../../messages/en.json";

/**
 * Câte oferte are un porumbel, scris pe cardul din listă.
 *
 * Daniel, uitându-se pe telefon: „aici spune 0 oferte dar este una". Chiar era
 * una — scria „o ofertă", care la font mic se citește „0 oferte". Acum scriem
 * cifra, ca să nu mai fie nicio îndoială.
 */
function ro_(cheie: "bidsCount" | "biddersCount", count: number) {
  return new IntlMessageFormat(ro.auction[cheie], "ro").format({ count }) as string;
}

describe("numărul de oferte, scris pe card", () => {
  it("una singură se scrie cu cifră, nu cu litera „o”", () => {
    expect(ro_("bidsCount", 1)).toBe("1 ofertă");
    expect(ro_("biddersCount", 1)).toBe("1 ofertant");
  });

  it("zero se spune în cuvinte, ca să nu semene cu „una”", () => {
    expect(ro_("bidsCount", 0)).toBe("nicio ofertă");
    expect(ro_("biddersCount", 0)).toBe("niciun ofertant");
  });

  it("restul numerelor sunt în regulă, cu formele românești", () => {
    expect(ro_("bidsCount", 3)).toBe("3 oferte");
    expect(ro_("bidsCount", 25)).toBe("25 de oferte");
    expect(ro_("biddersCount", 2)).toBe("2 ofertanți");
    expect(ro_("biddersCount", 21)).toBe("21 de ofertanți");
  });

  it("în engleză rămâne cum era — acolo nu se confundă nimic", () => {
    const en_ = (n: number) =>
      new IntlMessageFormat(en.auction.bidsCount, "en").format({ count: n }) as string;
    expect(en_(0)).toMatch(/no bids/i);
    expect(en_(1)).toMatch(/1|one/i);
    expect(en_(4)).toContain("4");
  });
});
