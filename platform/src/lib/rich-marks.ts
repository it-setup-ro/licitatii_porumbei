/**
 * Semnele de scriere din textele lungi (articole, povestea crescătorului,
 * descrieri, regulamente, pagini de informații).
 *
 * De ce un parser propriu și nu o bibliotecă de markdown: textul vine din
 * administrare și din propunerile crescătorilor, iar orice bibliotecă de
 * markdown produce HTML brut, pe care ar trebui apoi să-l curățăm de scripturi.
 * Aici nu se produce HTML niciodată: textul se taie în noduri, iar React le
 * randează ca elemente. Ce n-a fost recunoscut rămâne text, afișat ca atare.
 *
 * Semnele le scriu butoanele din editor; omul nu trebuie să le țină minte:
 *   **îngroșat**        *înclinat*
 *   [text](adresă)      {albastru|text colorat}
 *   - rând de listă     ## subtitlu
 */

/** Culorile puse la dispoziție. Mai multe ar face paginile pestrițe. */
export const CULORI = {
  albastru: "text-wing-blue",
  portocaliu: "text-mark-orange",
  verde: "text-mark-green",
  rosu: "text-wing-red",
} as const;

export type NumeCuloare = keyof typeof CULORI;

/** Scris fără diacritice în text, dar acceptat și cu, că așa tastează omul. */
const ALIAS_CULORI: Record<string, NumeCuloare> = {
  albastru: "albastru",
  portocaliu: "portocaliu",
  verde: "verde",
  rosu: "rosu",
  roșu: "rosu",
};

export type Nod =
  | { fel: "text"; text: string }
  | { fel: "bold"; copii: Nod[] }
  | { fel: "italic"; copii: Nod[] }
  | { fel: "culoare"; culoare: NumeCuloare; copii: Nod[] }
  | { fel: "link"; href: string; copii: Nod[] };

/**
 * Doar adrese pe care le putem deschide fără risc. `javascript:` și `data:`
 * sunt exact calea prin care un link devine cod executat în pagină.
 */
export function linkSigur(href: string): string | null {
  const curat = href.trim();
  if (/^https?:\/\/[^\s]+$/i.test(curat)) return curat;
  if (/^mailto:[^\s@]+@[^\s@]+$/i.test(curat)) return curat;
  // „www.ceva.ro" scris de om, fără protocol
  if (/^www\.[^\s]+$/i.test(curat)) return `https://${curat}`;
  // link intern, din propriul site
  if (/^\/[^\s]*$/.test(curat)) return curat;
  return null;
}

const TIPARE: { fel: Nod["fel"]; re: RegExp }[] = [
  { fel: "culoare", re: /\{([A-Za-zăâîșțĂÂÎȘȚ]+)\|([^{}]+)\}/ },
  { fel: "link", re: /\[([^\]\n]+)\]\(([^)\s]+)\)/ },
  { fel: "bold", re: /\*\*([^*\n]+)\*\*/ },
  { fel: "italic", re: /\*([^*\n]+)\*/ },
];

/** Taie un rând în noduri. Ce nu se potrivește rămâne text simplu. */
export function parseInline(text: string): Nod[] {
  if (!text) return [];

  let primul: { fel: Nod["fel"]; m: RegExpMatchArray; idx: number } | null = null;
  for (const t of TIPARE) {
    const m = text.match(t.re);
    if (m && m.index !== undefined && (primul === null || m.index < primul.idx)) {
      primul = { fel: t.fel, m, idx: m.index };
    }
  }
  if (!primul) return [{ fel: "text", text }];

  const { fel, m, idx } = primul;
  const inainte = idx > 0 ? parseInline(text.slice(0, idx)) : [];
  const dupa = parseInline(text.slice(idx + m[0].length));

  let nod: Nod | null = null;
  if (fel === "culoare") {
    const culoare = ALIAS_CULORI[m[1].toLowerCase()];
    // {ceva|text} cu un cuvânt care nu e culoare: nu ghicim, lăsăm textul cum e
    nod = culoare ? { fel: "culoare", culoare, copii: parseInline(m[2]) } : { fel: "text", text: m[0] };
  } else if (fel === "link") {
    const href = linkSigur(m[2]);
    nod = href ? { fel: "link", href, copii: parseInline(m[1]) } : { fel: "text", text: m[0] };
  } else {
    nod = { fel, copii: parseInline(m[1]) } as Nod;
  }

  return [...inainte, nod, ...dupa];
}

export type Bloc =
  | { fel: "titlu"; marime: 1 | 2; copii: Nod[] }
  | { fel: "lista"; randuri: Nod[][] }
  | { fel: "paragraf"; randuri: Nod[][] };

/** Taie textul întreg în blocuri: titluri, liste, paragrafe. */
export function parseBlocuri(text: string): Bloc[] {
  return text
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter((b) => b.length > 0)
    .map((bloc): Bloc => {
      if (bloc.startsWith("## ")) return { fel: "titlu", marime: 2, copii: parseInline(bloc.slice(3)) };
      if (bloc.startsWith("# ")) return { fel: "titlu", marime: 1, copii: parseInline(bloc.slice(2)) };

      const randuri = bloc.split("\n");
      // listă: toate rândurile încep cu „- ". Dacă doar unele, e paragraf —
      // altfel o liniuță de dialog ar transforma textul în listă.
      if (randuri.length > 0 && randuri.every((r) => /^[-•]\s+/.test(r.trim()))) {
        return { fel: "lista", randuri: randuri.map((r) => parseInline(r.trim().replace(/^[-•]\s+/, ""))) };
      }
      return { fel: "paragraf", randuri: randuri.map((r) => parseInline(r)) };
    });
}
