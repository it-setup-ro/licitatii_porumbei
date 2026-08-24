/**
 * Caracteristicile unui porumbel, dupa modelul fisei de pe pipa.be
 * („Characteristics" + „PPQC": constitutie, aripa si penaj).
 *
 * Sunt tinute intr-un singur camp JSON (`Pigeon.traitsJson`), nu in 20 de
 * coloane: sunt optionale, se completeaza rar toate si lista se mai schimba.
 * Ce se pierde e cautarea dupa ele in SQL — cand va fi nevoie, se scot in
 * coloane proprii doar cele dupa care chiar se filtreaza.
 *
 * Valorile sunt chei fixe (ascii), nu text liber: asa raman aceleasi in RO si
 * EN, iar la salvare orice cheie sau valoare necunoscuta e aruncata (whitelist).
 *
 * Sexul si culoarea nu sunt aici — au deja campuri proprii pe porumbel.
 */

export type TraitOption = { value: string; ro: string; en: string };

export type TraitField = {
  key: string;
  ro: string;
  en: string;
  /** true = se pot bifa mai multe (ex. specializarea la distante) */
  multi?: boolean;
  options: TraitOption[];
};

export type TraitGroup = { key: string; ro: string; en: string; fields: TraitField[] };

/** Scurtatura: cele mai multe randuri sunt slab / normal / puternic. */
function scale(
  key: string,
  ro: string,
  en: string,
  opts: [string, string, string][]
): TraitField {
  return {
    key,
    ro,
    en,
    options: opts.map(([value, r, e]) => ({ value, ro: r, en: e })),
  };
}

export const TRAIT_GROUPS: TraitGroup[] = [
  {
    key: "general",
    ro: "Caracteristici",
    en: "Characteristics",
    fields: [
      {
        key: "eyeColor",
        ro: "Culoarea ochiului",
        en: "Eye colour",
        options: [
          { value: "pearl", ro: "Perlat", en: "Pearl" },
          { value: "yellow", ro: "Galben", en: "Yellow" },
          { value: "orange", ro: "Portocaliu", en: "Orange" },
          { value: "red", ro: "Roșu", en: "Red" },
          { value: "white", ro: "Alb", en: "White" },
          { value: "brown", ro: "Brun", en: "Brown" },
          { value: "broken", ro: "Mixt (pigmentat)", en: "Broken" },
        ],
      },
      {
        key: "disciplines",
        ro: "Specializare",
        en: "Disciplines",
        multi: true,
        options: [
          { value: "sprint", ro: "Viteză", en: "Short distance" },
          { value: "middle", ro: "Demifond", en: "Middle distance" },
          { value: "long", ro: "Fond", en: "Long distance" },
          { value: "marathon", ro: "Mare fond", en: "Marathon" },
        ],
      },
    ],
  },
  {
    key: "body",
    ro: "Constituție",
    en: "Body",
    fields: [
      scale("size", "Mărime", "Size", [
        ["small", "Mic", "Small"],
        ["medium", "Mediu", "Medium"],
        ["large", "Mare", "Large"],
      ]),
      scale("thickness", "Corpolență", "Thickness", [
        ["fine", "Fin", "Fine"],
        ["normal", "Normal", "Normal"],
        ["plump", "Îndesat", "Plump"],
      ]),
      scale("vitality", "Vitalitate", "Vitality", [
        ["weak", "Slabă", "Weak"],
        ["normal", "Normală", "Normal"],
        ["strong", "Puternică", "Strong"],
      ]),
      scale("colorDensity", "Intensitatea culorii", "Colour density", [
        ["weak", "Slabă", "Weak"],
        ["normal", "Normală", "Normal"],
        ["strong", "Puternică", "Strong"],
      ]),
      scale("length", "Lungime", "Length", [
        ["short", "Scurt", "Short"],
        ["normal", "Normal", "Normal"],
        ["long", "Lung", "Long"],
      ]),
      scale("strength", "Robustețe", "Strength", [
        ["weak", "Slabă", "Weak"],
        ["normal", "Normală", "Normal"],
        ["strong", "Puternică", "Strong"],
      ]),
      scale("ventboneStrength", "Oase pubiene — rezistență", "Ventbones strength", [
        ["weak", "Slabă", "Weak"],
        ["normal", "Normală", "Normal"],
        ["strong", "Puternică", "Strong"],
      ]),
      scale("ventbonePosition", "Oase pubiene — poziție", "Ventbones position", [
        ["open", "Deschise", "Open"],
        ["normal", "Normale", "Normal"],
        ["closed", "Închise", "Closed"],
        ["veryClosed", "Foarte închise", "Very closed"],
      ]),
      scale("muscles", "Musculatură", "Muscles", [
        ["hard", "Tare", "Hard"],
        ["normal", "Normală", "Normal"],
        ["supple", "Suplă", "Supple"],
      ]),
      scale("balance", "Echilibru în mână", "Balance", [
        ["unbalanced", "Dezechilibrat", "Unbalanced"],
        ["balanced", "Echilibrat", "Balanced"],
        ["veryBalanced", "Foarte echilibrat", "Very balanced"],
      ]),
      scale("back", "Spate", "Back", [
        ["weak", "Slab", "Weak"],
        ["normal", "Normal", "Normal"],
        ["strong", "Puternic", "Strong"],
      ]),
    ],
  },
  {
    key: "wing",
    ro: "Aripă și penaj",
    en: "Wing and plumage",
    fields: [
      scale("breedingFeathers", "Remige — formă", "Breeding feathers", [
        ["squareShort", "Pătrate și scurte", "Square and short"],
        ["squareLong", "Pătrate și lungi", "Square and long"],
        ["pointedShort", "Ascuțite și scurte", "Pointed and short"],
        ["pointedLong", "Ascuțite și lungi", "Pointed and long"],
      ]),
      scale("feather", "Pana", "Feather", [
        ["short", "Scurtă", "Short"],
        ["normal", "Normală", "Normal"],
        ["long", "Lungă", "Long"],
      ]),
      scale("plumage", "Penaj", "Plumage", [
        ["thin", "Subțire", "Thin"],
        ["normal", "Normal", "Normal"],
        ["thick", "Bogat", "Thick"],
      ]),
      scale("feathersTexture", "Textura penelor", "Feathers", [
        ["rough", "Aspră", "Rough"],
        ["normal", "Normală", "Normal"],
        ["soft", "Mătăsoasă", "Soft"],
      ]),
      scale("secondaries", "Pene secundare", "Secondaries", [
        ["irregular", "Neregulate", "Irregular"],
        ["regular", "Regulate", "Regular"],
        ["veryRegular", "Foarte regulate", "Very regular"],
      ]),
      scale("suppleness", "Suplețe", "Suppleness", [
        ["stiff", "Rigidă", "Stiff"],
        ["normal", "Normală", "Normal"],
        ["supple", "Suplă", "Supple"],
      ]),
    ],
  },
];

export const TRAIT_FIELDS: TraitField[] = TRAIT_GROUPS.flatMap((g) => g.fields);

/** Valorile alese: cheie de camp -> o valoare, sau mai multe la campurile „multi". */
export type PigeonTraits = Record<string, string | string[]>;

/**
 * Pastreaza doar campurile si valorile din lista de mai sus. Orice altceva
 * (chei inventate, text liber, obiecte) e aruncat — datele ajung direct in
 * pagina publica, deci nu au voie sa contina ce n-am definit noi.
 */
export function sanitizeTraits(input: unknown): PigeonTraits {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const raw = input as Record<string, unknown>;
  const out: PigeonTraits = {};

  for (const field of TRAIT_FIELDS) {
    const value = raw[field.key];
    const allowed = new Set(field.options.map((o) => o.value));

    if (field.multi) {
      if (!Array.isArray(value)) continue;
      const picked = value.filter((v): v is string => typeof v === "string" && allowed.has(v));
      if (picked.length > 0) out[field.key] = [...new Set(picked)];
    } else if (typeof value === "string" && allowed.has(value)) {
      out[field.key] = value;
    }
  }
  return out;
}

/** Citeste ce e in DB, iertator: un JSON stricat inseamna „fara caracteristici". */
export function parseTraits(json: string | null | undefined): PigeonTraits {
  if (!json) return {};
  try {
    return sanitizeTraits(JSON.parse(json));
  } catch {
    return {};
  }
}

/** Eticheta si valorile traduse, gata de afisat. Doar campurile completate. */
export function describeTraits(traits: PigeonTraits, locale: string) {
  const lang = locale === "en" ? "en" : "ro";
  return TRAIT_GROUPS.map((group) => ({
    key: group.key,
    label: group[lang],
    rows: group.fields
      .filter((f) => traits[f.key] !== undefined)
      .map((f) => {
        const raw = traits[f.key];
        const values = Array.isArray(raw) ? raw : [raw];
        return {
          key: f.key,
          label: f[lang],
          value: values
            .map((v) => f.options.find((o) => o.value === v)?.[lang] ?? v)
            .join(", "),
        };
      }),
  })).filter((g) => g.rows.length > 0);
}
