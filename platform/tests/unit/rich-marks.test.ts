import { describe, it, expect } from "vitest";
import { parseInline, parseBlocuri, linkSigur } from "@/lib/rich-marks";

/** Scoate textul dintr-un arbore de noduri, ca să fie ușor de comparat. */
function text(noduri: ReturnType<typeof parseInline>): string {
  return noduri
    .map((n) => (n.fel === "text" ? n.text : "copii" in n ? text(n.copii) : ""))
    .join("");
}

describe("semnele de scriere", () => {
  it("îngroșat, înclinat și text simplu stau laolaltă", () => {
    const n = parseInline("Un **porumbel** foarte *bun*.");
    expect(n.map((x) => x.fel)).toEqual(["text", "bold", "text", "italic", "text"]);
    expect(text(n)).toBe("Un porumbel foarte bun.");
  });

  it("culorile cerute de client: mascul albastru, femelă portocaliu", () => {
    const n = parseInline("{albastru|mascul} și {portocaliu|femelă}");
    const culori = n.filter((x) => x.fel === "culoare");
    expect(culori).toHaveLength(2);
    expect(culori.map((c) => (c.fel === "culoare" ? c.culoare : ""))).toEqual([
      "albastru",
      "portocaliu",
    ]);
  });

  it("„roșu” merge scris și cu diacritice", () => {
    const n = parseInline("{roșu|atenție}");
    expect(n[0].fel === "culoare" && n[0].culoare).toBe("rosu");
  });

  it("un cuvânt care nu e culoare rămâne text, nu dispare", () => {
    const n = parseInline("{mov|ceva}");
    expect(n).toEqual([{ fel: "text", text: "{mov|ceva}" }]);
  });

  it("îngroșatul poate sta în interiorul culorii", () => {
    const n = parseInline("{verde|**campion**}");
    expect(n[0].fel).toBe("culoare");
    expect(n[0].fel === "culoare" && n[0].copii[0].fel).toBe("bold");
  });

  it("linkurile bune trec, cele periculoase rămân text", () => {
    expect(linkSigur("https://voiajor.net")).toBe("https://voiajor.net");
    expect(linkSigur("www.voiajor.net")).toBe("https://www.voiajor.net");
    expect(linkSigur("/ro/auctions")).toBe("/ro/auctions");
    expect(linkSigur("mailto:a@b.ro")).toBe("mailto:a@b.ro");
    expect(linkSigur("javascript:alert(1)")).toBeNull();
    expect(linkSigur("data:text/html,<script>")).toBeNull();
  });

  it("un link cu adresă periculoasă se afișează ca text, nu ca legătură", () => {
    const n = parseInline("[apasă](javascript:alert(1))");
    expect(n.every((x) => x.fel === "text")).toBe(true);
  });

  it("o stea singură nu strică textul", () => {
    expect(text(parseInline("3 * 4 = 12"))).toBe("3 * 4 = 12");
  });
});

describe("blocurile", () => {
  it("subtitlurile vechi („## ”) merg mai departe", () => {
    const b = parseBlocuri("## Povestea\n\nUn paragraf.");
    expect(b[0].fel).toBe("titlu");
    expect(b[1].fel).toBe("paragraf");
  });

  it("rândurile care încep toate cu liniuță devin listă", () => {
    const b = parseBlocuri("- unu\n- doi\n- trei");
    expect(b[0].fel).toBe("lista");
    expect(b[0].fel === "lista" && b[0].randuri).toHaveLength(3);
  });

  it("o singură liniuță între rânduri normale nu face listă", () => {
    const b = parseBlocuri("Un rând\n- altul");
    expect(b[0].fel).toBe("paragraf");
  });

  it("rândul gol desparte paragrafele, enterul simplu doar rupe rândul", () => {
    const b = parseBlocuri("unu\ndoi\n\ntrei");
    expect(b).toHaveLength(2);
    expect(b[0].fel === "paragraf" && b[0].randuri).toHaveLength(2);
  });
});
