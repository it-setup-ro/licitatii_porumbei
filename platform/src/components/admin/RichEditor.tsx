"use client";

import { useRef, useState, useId, useLayoutEffect } from "react";
import RichText from "@/components/RichText";

/**
 * Caseta de scris cu butoane, pentru textele lungi care ajung pe site
 * (articole, povestea crescătorului, descrieri, regulamente, pagini).
 *
 * Butoanele scriu semnele din `lib/rich-marks.ts` în jurul textului selectat,
 * ca omul să nu le țină minte. „Vezi cum arată" randează cu exact aceeași
 * componentă ca pagina publică — ce se vede aici e ce va fi pe site.
 *
 * Daniel: „sa imi arati cum se scrie cu fonturile si culorile si cum arata după".
 */

type Semn = {
  eticheta: string;
  titlu: string;
  inainte: string;
  dupa: string;
  /** butoanele de culoare se desenează cu culoarea lor */
  clasa?: string;
  /** titlurile și listele se pun la începutul rândului, nu în jurul selecției */
  peRand?: boolean;
};

const SEMNE: Semn[] = [
  { eticheta: "B", titlu: "Îngroșat", inainte: "**", dupa: "**", clasa: "font-bold" },
  { eticheta: "I", titlu: "Înclinat", inainte: "*", dupa: "*", clasa: "italic" },
  { eticheta: "Subtitlu", titlu: "Subtitlu (rând întreg)", inainte: "## ", dupa: "", peRand: true },
  { eticheta: "Listă", titlu: "Rând de listă", inainte: "- ", dupa: "", peRand: true },
  { eticheta: "Link", titlu: "Legătură către o adresă", inainte: "[", dupa: "](https://)" },
];

const CULORI_BUTOANE: Semn[] = [
  { eticheta: "Albastru", titlu: "Text albastru", inainte: "{albastru|", dupa: "}", clasa: "text-wing-blue" },
  { eticheta: "Portocaliu", titlu: "Text portocaliu", inainte: "{portocaliu|", dupa: "}", clasa: "text-mark-orange" },
  { eticheta: "Verde", titlu: "Text verde", inainte: "{verde|", dupa: "}", clasa: "text-mark-green" },
  { eticheta: "Roșu", titlu: "Text roșu", inainte: "{rosu|", dupa: "}", clasa: "text-wing-red" },
];

export default function RichEditor({
  id,
  value,
  onChange,
  rows = 10,
  placeholder,
  name,
  className,
  /** testid-ul casetei de scris: ramine exact cel dinainte, ca testele si
      obisnuintele sa nu se schimbe; butoanele primesc `-buton-…` */
  testid = "rich-editor",
}: {
  /** id-ul casetei, ca eticheta de deasupra sa fie legata de ea */
  id?: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
  name?: string;
  className?: string;
  testid?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [previzualizare, setPrevizualizare] = useState(false);
  const idAjutor = useId();

  /**
   * Unde trebuie să ajungă cursorul după ce un buton a schimbat textul.
   *
   * Nu se poate pune pe loc: caseta e controlată de React, iar textul nou
   * ajunge în ea abia la randarea următoare — pusă înainte, selecția se
   * pierdea și omul scria la începutul articolului, nu între semne.
   */
  const deSelectat = useRef<[number, number] | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    const sel = deSelectat.current;
    if (!el || !sel) return;
    deSelectat.current = null;
    el.focus();
    el.setSelectionRange(sel[0], sel[1]);
  });

  const aplica = (s: Semn) => {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? start;

    let nou: string;
    let selDe: number;
    let selPana: number;

    if (s.peRand) {
      // Subtitlu și listă se pun în fața rândului pe care stă cursorul.
      const inceputRand = value.lastIndexOf("\n", start - 1) + 1;
      nou = value.slice(0, inceputRand) + s.inainte + value.slice(inceputRand);
      selDe = selPana = end + s.inainte.length;
    } else {
      const avea = start !== end;
      const ales = avea ? value.slice(start, end) : "text";
      nou = value.slice(0, start) + s.inainte + ales + s.dupa + value.slice(end);
      // Dacă n-avea nimic selectat, rămâne selectat cuvântul „text", ca omul
      // să scrie direct peste el; altfel cursorul stă după textul lui.
      selDe = start + s.inainte.length + (avea ? ales.length : 0);
      selPana = start + s.inainte.length + ales.length;
    }

    deSelectat.current = [selDe, selPana];
    onChange(nou);
  };

  const buton = (s: Semn) => (
    <button
      key={s.eticheta}
      type="button"
      title={s.titlu}
      onClick={() => aplica(s)}
      data-testid={`${testid}-buton-${s.eticheta.toLowerCase().replace(/[^a-z]/g, "")}`}
      className={`rounded-lg border border-ink/15 bg-white px-2.5 py-1.5 text-xs font-semibold hover:border-wing-blue ${s.clasa ?? ""}`}
    >
      {s.eticheta}
    </button>
  );

  return (
    <div className={className} data-testid={`${testid}-editor`}>
      <div className="flex flex-wrap items-center gap-1.5 rounded-t-xl border border-b-0 border-ink/15 bg-ivory-soft px-2 py-2">
        {SEMNE.map(buton)}
        <span className="mx-1 h-5 w-px bg-ink/15" aria-hidden="true" />
        {CULORI_BUTOANE.map(buton)}
        <button
          type="button"
          onClick={() => setPrevizualizare((v) => !v)}
          data-testid={`${testid}-vezi`}
          className="ms-auto rounded-lg border border-ink/15 bg-white px-2.5 py-1.5 text-xs font-semibold hover:border-wing-blue"
        >
          {previzualizare ? "Înapoi la scris" : "Vezi cum arată"}
        </button>
      </div>

      {previzualizare ? (
        <div
          className="min-h-[8rem] rounded-b-xl border border-ink/15 bg-white px-4 py-3"
          data-testid={`${testid}-previzualizare`}
        >
          {value.trim() ? (
            <RichText text={value} />
          ) : (
            <p className="text-ink/40">Nu e scris nimic încă.</p>
          )}
        </div>
      ) : (
        <textarea
          id={id}
          ref={ref}
          name={name}
          value={value}
          rows={rows}
          placeholder={placeholder}
          aria-describedby={idAjutor}
          onChange={(e) => onChange(e.target.value)}
          data-testid={testid}
          className="w-full resize-y rounded-b-xl border border-ink/15 px-4 py-3 text-base leading-relaxed outline-none focus:border-wing-blue"
        />
      )}

      <p id={idAjutor} className="mt-1 text-xs text-ink/50">
        Selectează textul și apasă un buton. Rând gol = paragraf nou.
      </p>
    </div>
  );
}
