/**
 * Generează pedigree-urile demonstrative pentru loturile din datele demo.
 *
 * Un pedigree real nu e un act al federației, ci documentul crescătoriei:
 * datele porumbelului, arborele pe trei generații și palmaresul strămoșilor.
 * Astea sunt exact în forma aceea, dar cu date inventate — de aceea fiecare
 * poartă jos mențiunea „document demonstrativ".
 *
 * Rulare:  node scripts/pedigrees.mjs
 * Ieșire:  public/pigeons/pedigree-<slug>.svg
 */

import { writeFileSync } from "fs";
import { join } from "path";

const OUT = join(process.cwd(), "public", "pigeons");

const W = 1400;
const H = 800;

/** Scapă textul pentru XML — un & sau < în date ar rupe fișierul. */
const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

/** Taie textul prea lung, ca să nu iasă din chenar. */
const cut = (s, n) => (String(s).length > n ? String(s).slice(0, n - 1) + "…" : String(s));

function cell(x, y, w, h, a, depth) {
  if (!a) {
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="#fff" stroke="#d9d5cc" stroke-dasharray="3 3"/>`;
  }
  const pad = 8;
  const nameSize = depth === 0 ? 15 : 13;
  let out = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="${
    depth === 0 ? "#f7f9fc" : "#fff"
  }" stroke="${depth === 0 ? "#9db4d0" : "#ded9d0"}"/>`;
  out += `<text x="${x + pad}" y="${y + 18}" font-family="Arial, Helvetica, sans-serif" font-size="${nameSize}" font-weight="700" fill="#1b1a17">${esc(
    cut(a.name, depth === 0 ? 26 : 22)
  )}</text>`;
  out += `<text x="${x + pad}" y="${y + 35}" font-family="Arial, Helvetica, sans-serif" font-size="11.5" fill="#5d5850" letter-spacing="0.4">${esc(
    a.ring
  )}</text>`;
  (a.notes || []).slice(0, depth === 0 ? 3 : 2).forEach((n, i) => {
    out += `<text x="${x + pad}" y="${y + 52 + i * 14}" font-family="Arial, Helvetica, sans-serif" font-size="11" fill="#8a7f57">${esc(
      cut(n, depth === 0 ? 34 : 28)
    )}</text>`;
  });
  return out;
}

function svg(d) {
  const g1h = 190; // înălțime celulă generația 1
  const g2h = 92;
  const g3h = 44;
  const colW = [250, 250, 250];
  const treeX = 470;
  const treeY = 250;
  const gap = 8;

  const p = [];

  // fundal + ramă
  p.push(`<rect width="${W}" height="${H}" fill="#faf8f4"/>`);
  p.push(`<rect x="18" y="18" width="${W - 36}" height="${H - 36}" fill="none" stroke="#1b1a17" stroke-width="2"/>`);
  p.push(`<rect x="26" y="26" width="${W - 52}" height="${H - 52}" fill="none" stroke="#c9bfa4" stroke-width="1"/>`);

  // antet
  p.push(`<rect x="26" y="26" width="${W - 52}" height="86" fill="#1b1a17"/>`);
  p.push(
    `<text x="52" y="72" font-family="Georgia, 'Times New Roman', serif" font-size="30" font-weight="700" fill="#f6f3ec" letter-spacing="0.5">${esc(
      d.loft
    )}</text>`
  );
  p.push(
    `<text x="52" y="95" font-family="Arial, Helvetica, sans-serif" font-size="13" fill="#c9bfa4" letter-spacing="2.6">CERTIFICAT DE ORIGINE · PEDIGREE</text>`
  );
  p.push(
    `<text x="${W - 52}" y="72" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-size="13" fill="#c9bfa4" letter-spacing="1.4">${esc(
      d.country
    )}</text>`
  );
  p.push(
    `<text x="${W - 52}" y="95" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-size="12" fill="#8f8878">${esc(
      d.issued
    )}</text>`
  );

  // ─── fișa porumbelului (stânga) ───
  const bx = 52;
  let by = 150;
  p.push(
    `<text x="${bx}" y="${by}" font-family="Arial, Helvetica, sans-serif" font-size="11.5" fill="#8a8478" letter-spacing="2.2">PORUMBELUL</text>`
  );
  by += 34;
  p.push(
    `<text x="${bx}" y="${by}" font-family="Georgia, 'Times New Roman', serif" font-size="34" font-weight="700" fill="#1b1a17">${esc(
      d.name
    )}</text>`
  );
  by += 30;
  p.push(
    `<text x="${bx}" y="${by}" font-family="Arial, Helvetica, sans-serif" font-size="17" fill="#c1651f" letter-spacing="1.2" font-weight="700">${esc(
      d.ring
    )}</text>`
  );

  by += 34;
  const facts = [
    ["An", d.year],
    ["Sex", d.sex],
    ["Culoare", d.color],
    ["Linie", d.strain],
  ];
  facts.forEach(([k, v], i) => {
    const yy = by + i * 26;
    p.push(
      `<text x="${bx}" y="${yy}" font-family="Arial, Helvetica, sans-serif" font-size="12" fill="#8a8478">${esc(k)}</text>`
    );
    p.push(
      `<text x="${bx + 92}" y="${yy}" font-family="Arial, Helvetica, sans-serif" font-size="13.5" font-weight="700" fill="#1b1a17">${esc(
        v
      )}</text>`
    );
  });

  // palmares
  let py = by + facts.length * 26 + 24;
  p.push(
    `<text x="${bx}" y="${py}" font-family="Arial, Helvetica, sans-serif" font-size="11.5" fill="#8a8478" letter-spacing="2.2">PALMARES</text>`
  );
  py += 12;
  (d.results || []).slice(0, 7).forEach((r, i) => {
    const yy = py + 20 + i * 24;
    p.push(`<rect x="${bx}" y="${yy - 13}" width="34" height="18" rx="3" fill="#f2c94c"/>`);
    p.push(
      `<text x="${bx + 17}" y="${yy}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="11.5" font-weight="700" fill="#1b1a17">${esc(
        r.place
      )}</text>`
    );
    p.push(
      `<text x="${bx + 44}" y="${yy}" font-family="Arial, Helvetica, sans-serif" font-size="12.5" fill="#3a352d">${esc(
        cut(r.text, 40)
      )}</text>`
    );
  });

  // ─── arborele (dreapta) ───
  p.push(
    `<text x="${treeX}" y="${treeY - 26}" font-family="Arial, Helvetica, sans-serif" font-size="11.5" fill="#8a8478" letter-spacing="2.2">ASCENDENȚĂ — 3 GENERAȚII</text>`
  );

  const sire = d.sire || {};
  const dam = d.dam || {};

  // generația 1
  p.push(cell(treeX, treeY, colW[0], g1h, sire, 0));
  p.push(cell(treeX, treeY + g1h + 30, colW[0], g1h, dam, 0));
  p.push(
    `<text x="${treeX}" y="${treeY - 6}" font-family="Arial, Helvetica, sans-serif" font-size="10.5" fill="#9db4d0" letter-spacing="1.6">TATĂ</text>`
  );
  p.push(
    `<text x="${treeX}" y="${treeY + g1h + 24}" font-family="Arial, Helvetica, sans-serif" font-size="10.5" fill="#9db4d0" letter-spacing="1.6">MAMĂ</text>`
  );

  // generația 2
  const x2 = treeX + colW[0] + 22;
  const g2 = [
    [sire.sire, treeY],
    [sire.dam, treeY + g1h - g2h],
    [dam.sire, treeY + g1h + 30],
    [dam.dam, treeY + g1h + 30 + g1h - g2h],
  ];
  g2.forEach(([a, y]) => p.push(cell(x2, y, colW[1], g2h, a, 1)));

  // generația 3
  const x3 = x2 + colW[1] + 22;
  const g3 = [
    [sire.sire?.sire, treeY],
    [sire.sire?.dam, treeY + g2h - g3h],
    [sire.dam?.sire, treeY + g1h - g2h],
    [sire.dam?.dam, treeY + g1h - g3h],
    [dam.sire?.sire, treeY + g1h + 30],
    [dam.sire?.dam, treeY + g1h + 30 + g2h - g3h],
    [dam.dam?.sire, treeY + g1h + 30 + g1h - g2h],
    [dam.dam?.dam, treeY + g1h + 30 + g1h - g3h],
  ];
  g3.forEach(([a, y]) => p.push(cell(x3, y, colW[2], g3h, a, 2)));

  // linii de legătură
  const line = (x1, y1, x2b, y2) =>
    `<path d="M${x1} ${y1} H${(x1 + x2b) / 2} V${y2} H${x2b}" fill="none" stroke="#ded9d0" stroke-width="1"/>`;
  p.push(line(treeX + colW[0], treeY + g1h / 2, x2, treeY + g2h / 2));
  p.push(line(treeX + colW[0], treeY + g1h / 2, x2, treeY + g1h - g2h / 2));
  p.push(line(treeX + colW[0], treeY + g1h + 30 + g1h / 2, x2, treeY + g1h + 30 + g2h / 2));
  p.push(
    line(treeX + colW[0], treeY + g1h + 30 + g1h / 2, x2, treeY + g1h + 30 + g1h - g2h / 2)
  );

  // ─── subsol ───
  const fy = H - 96;
  p.push(`<line x1="52" y1="${fy}" x2="${W - 52}" y2="${fy}" stroke="#ded9d0"/>`);
  p.push(
    `<text x="52" y="${fy + 26}" font-family="Arial, Helvetica, sans-serif" font-size="12.5" fill="#3a352d">Crescător: <tspan font-weight="700">${esc(
      d.breeder
    )}</tspan></text>`
  );
  p.push(
    `<text x="52" y="${fy + 46}" font-family="Arial, Helvetica, sans-serif" font-size="11.5" fill="#8a8478">${esc(
      d.address
    )}</text>`
  );
  p.push(
    `<text x="${W - 52}" y="${fy + 26}" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-size="11.5" fill="#8a8478">Semnătura crescătorului</text>`
  );
  p.push(
    `<line x1="${W - 300}" y1="${fy + 44}" x2="${W - 52}" y2="${fy + 44}" stroke="#8a8478" stroke-width="0.8"/>`
  );
  p.push(
    `<text x="52" y="${H - 34}" font-family="Arial, Helvetica, sans-serif" font-size="11" fill="#b4a98c" letter-spacing="1.4">DOCUMENT DEMONSTRATIV — date fictive, generate pentru testarea platformei</text>`
  );

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Pedigree ${esc(
    d.name
  )}">${p.join("")}</svg>`;
}

// ─────────────────────────────────────────────────────────────────────
// Datele demo. Inele fictive, nume de strămoși inventate.
// ─────────────────────────────────────────────────────────────────────

const LOFT = "Columbodromul Câmpeanu";
const ADDR = "Str. Aripilor nr. 14, Cluj-Napoca · România";

const a = (ring, name, notes, sire, dam) => ({ ring, name, notes, sire, dam });

const PEDIGREES = [
  {
    slug: "fulger-albastru",
    name: "Fulger Albastru",
    ring: "RO 2023 445566",
    year: "2023",
    sex: "Mascul",
    color: "Vânăt barat",
    strain: "Janssen",
    loft: LOFT,
    breeder: "Janssen Bros. — import 2019",
    address: ADDR,
    country: "ROMÂNIA",
    issued: "Emis: 12.03.2024",
    results: [
      { place: "3", text: "Arad — Fond 520 km, 2.140 porumbei" },
      { place: "7", text: "Oradea — Demifond 380 km, 3.200 p." },
      { place: "1", text: "Satu Mare 410 km, 1.860 porumbei" },
      { place: "12", text: "Timișoara — Fond 495 km" },
    ],
    sire: a(
      "BE 2019 6041122",
      "Blue Thunder",
      ["1. Național Fond 2021", "As al zonei 2020–2021"],
      a("BE 2016 6127788", "Old Thunder", ["4. Național Bourges"], a("BE 2013 6009911", "Thunder Base"), a("BE 2014 6110044", "Silver Line")),
      a("BE 2017 6033120", "Storm Lady", ["2. Provincial Argenton"], a("BE 2014 6220077", "Storm King"), a("BE 2015 6118800", "Lady Grey"))
    ),
    dam: a(
      "RO 2020 118299",
      "Golden Wing",
      ["Mamă de campioni", "5 pui clasați național"],
      a("BE 2016 6099001", "Goldfinger", ["1. Interprovincial Blois"], a("BE 2013 6077120", "Gold Base"), a("BE 2014 6088211", "Amber")),
      a("RO 2017 220456", "Silver Queen", ["3. Național Marathon"], a("RO 2014 330122", "Silver Ace"), a("RO 2015 118077", "Queen Mary"))
    ),
  },
  {
    slug: "regina-nordului",
    name: "Regina Nordului",
    ring: "RO 2022 118822",
    year: "2022",
    sex: "Femelă",
    color: "Vânăt pestriț",
    strain: "Van Loon",
    loft: LOFT,
    breeder: "Van Loon — import 2022",
    address: ADDR,
    country: "ROMÂNIA",
    issued: "Emis: 04.02.2024",
    results: [
      { place: "1", text: "As demifond județean 2024" },
      { place: "2", text: "Cluj — Demifond 340 km, 2.400 p." },
      { place: "6", text: "Dej — Viteză 210 km, 1.700 p." },
    ],
    sire: a(
      "NL 2019 1284410",
      "Nordic Prince",
      ["1. As demifond NPO 2021"],
      a("NL 2016 1177200", "North Star", ["2. Nat. Chimay"], a("NL 2013 1099001", "Polaris"), a("NL 2014 1122330", "Aurora")),
      a("NL 2017 1201188", "Ice Queen", ["1. Prov. Quievrain"], a("NL 2014 1155002", "Frost"), a("NL 2015 1166443", "Snowdrop"))
    ),
    dam: a(
      "RO 2019 447120",
      "Perla Albastră",
      ["Soră cu 1. Național 2021"],
      a("RO 2016 220990", "Albastru Regal", ["4. Național Fond"], a("RO 2013 118221", "Regal Base"), a("RO 2014 337001", "Zâna")),
      a("RO 2017 550311", "Ana", ["Mamă a 3 ași"], a("RO 2014 118654", "Vulturul"), a("RO 2015 220118", "Steluța"))
    ),
  },
  {
    slug: "as-de-fond",
    name: "As de Fond",
    ring: "RO 2021 337788",
    year: "2021",
    sex: "Mascul",
    color: "Roșcat",
    strain: "Aarden",
    loft: LOFT,
    breeder: "Aarden — linia originală",
    address: ADDR,
    country: "ROMÂNIA",
    issued: "Emis: 19.11.2023",
    results: [
      { place: "2", text: "Național Mare Fond 780 km" },
      { place: "5", text: "Brăila — Fond 610 km, 4.100 p." },
      { place: "9", text: "Constanța — Mare fond 720 km" },
      { place: "14", text: "Galați — Fond 580 km" },
    ],
    sire: a(
      "NL 2018 1499220",
      "Marathon King",
      ["1. Nat. Perpignan 2020", "Cap de linie mare fond"],
      a("NL 2015 1388110", "Long Distance", ["3. Nat. Barcelona"], a("NL 2012 1255003", "Endurance"), a("NL 2013 1277440", "Patience")),
      a("NL 2016 1401177", "Iron Hen", ["6. Nat. Dax"], a("NL 2013 1300221", "Iron Man"), a("NL 2014 1355660", "Steel Lady"))
    ),
    dam: a(
      "RO 2018 660221",
      "Roșcata",
      ["Mamă a 2 ași de fond"],
      a("RO 2015 337009", "Foc", ["1. Județean Fond"], a("RO 2012 118990", "Scânteia"), a("RO 2013 220771", "Flacăra")),
      a("RO 2016 445118", "Dunărea", ["8. Național Fond"], a("RO 2013 550220", "Delta"), a("RO 2014 660443", "Balta"))
    ),
  },
  {
    slug: "vant-de-vest",
    name: "Vânt de Vest",
    ring: "RO 2024 990011",
    year: "2024",
    sex: "Mascul",
    color: "Vânăt deschis",
    strain: "Janssen × Van Loon",
    loft: LOFT,
    breeder: LOFT,
    address: ADDR,
    country: "ROMÂNIA",
    issued: "Emis: 08.05.2025",
    results: [
      { place: "4", text: "Zalău — Viteză 180 km, 980 pui" },
      { place: "11", text: "Oradea — Viteză 220 km" },
    ],
    sire: a(
      "RO 2021 445566",
      "Fulger Albastru",
      ["3. Fond Arad 2024", "Frate de cuib cu 1° Arad"],
      a("BE 2019 6041122", "Blue Thunder", ["1. Nat. Fond 2021"], a("BE 2016 6127788", "Old Thunder"), a("BE 2017 6033120", "Storm Lady")),
      a("RO 2020 118299", "Golden Wing", ["Mamă de campioni"], a("BE 2016 6099001", "Goldfinger"), a("RO 2017 220456", "Silver Queen"))
    ),
    dam: a(
      "RO 2022 118822",
      "Regina Nordului",
      ["1. As demifond 2024"],
      a("NL 2019 1284410", "Nordic Prince", ["1. As demifond NPO"], a("NL 2016 1177200", "North Star"), a("NL 2017 1201188", "Ice Queen")),
      a("RO 2019 447120", "Perla Albastră", ["Soră cu 1. Național"], a("RO 2016 220990", "Albastru Regal"), a("RO 2017 550311", "Ana"))
    ),
  },
  {
    slug: "perla",
    name: "Perla",
    ring: "RO 2024 220044",
    year: "2024",
    sex: "Femelă",
    color: "Alb-argintiu",
    strain: "Janssen × Aarden",
    loft: LOFT,
    breeder: LOFT,
    address: ADDR,
    country: "ROMÂNIA",
    issued: "Emis: 08.05.2025",
    results: [{ place: "6", text: "Dej — Viteză 210 km, pui 2024" }],
    sire: a(
      "RO 2021 337788",
      "As de Fond",
      ["2. Național Mare Fond 780 km"],
      a("NL 2018 1499220", "Marathon King", ["1. Nat. Perpignan"], a("NL 2015 1388110", "Long Distance"), a("NL 2016 1401177", "Iron Hen")),
      a("RO 2018 660221", "Roșcata", ["Mamă a 2 ași"], a("RO 2015 337009", "Foc"), a("RO 2016 445118", "Dunărea"))
    ),
    dam: a(
      "RO 2020 118299",
      "Golden Wing",
      ["Mamă de campioni", "Cuplul de aur al crescătoriei"],
      a("BE 2016 6099001", "Goldfinger", ["1. Interprov. Blois"], a("BE 2013 6077120", "Gold Base"), a("BE 2014 6088211", "Amber")),
      a("RO 2017 220456", "Silver Queen", ["3. Național Marathon"], a("RO 2014 330122", "Silver Ace"), a("RO 2015 118077", "Queen Mary"))
    ),
  },
  {
    slug: "sageata-alba",
    name: "Săgeata Albă",
    ring: "RO 2024 550077",
    year: "2024",
    sex: "Mascul",
    color: "Alb cu șa vânătă",
    strain: "Janssen",
    loft: LOFT,
    breeder: LOFT,
    address: ADDR,
    country: "ROMÂNIA",
    issued: "Emis: 20.06.2025",
    results: [{ place: "8", text: "Zalău — Viteză 180 km, pui 2024" }],
    sire: a(
      "RO 2021 445566",
      "Fulger Albastru",
      ["3. Fond Arad 2024"],
      a("BE 2019 6041122", "Blue Thunder", ["1. Nat. Fond 2021"], a("BE 2016 6127788", "Old Thunder"), a("BE 2017 6033120", "Storm Lady")),
      a("RO 2020 118299", "Golden Wing", ["Mamă de campioni"], a("BE 2016 6099001", "Goldfinger"), a("RO 2017 220456", "Silver Queen"))
    ),
    dam: a(
      "RO 2021 770122",
      "Albina",
      ["4. Județean Demifond"],
      a("RO 2018 445990", "Aripă Albă", ["2. Județean Viteză"], a("RO 2015 337221", "Nea"), a("RO 2016 118443", "Bruma")),
      a("RO 2019 660554", "Lumina", ["Mamă a 2 clasați"], a("RO 2016 220118", "Raza"), a("RO 2017 445002", "Zori"))
    ),
  },
  {
    slug: "perla-nordului",
    name: "Perla Nordului",
    ring: "RO 2023 660088",
    year: "2023",
    sex: "Femelă",
    color: "Vânăt-argintiu",
    strain: "Van Loon",
    loft: LOFT,
    breeder: LOFT,
    address: ADDR,
    country: "ROMÂNIA",
    issued: "Emis: 15.01.2025",
    results: [
      { place: "5", text: "Cluj — Demifond 340 km, 2.100 p." },
      { place: "13", text: "Dej — Viteză 210 km" },
    ],
    sire: a(
      "NL 2019 1284410",
      "Nordic Prince",
      ["1. As demifond NPO 2021"],
      a("NL 2016 1177200", "North Star", ["2. Nat. Chimay"], a("NL 2013 1099001", "Polaris"), a("NL 2014 1122330", "Aurora")),
      a("NL 2017 1201188", "Ice Queen", ["1. Prov. Quievrain"], a("NL 2014 1155002", "Frost"), a("NL 2015 1166443", "Snowdrop"))
    ),
    dam: a(
      "RO 2022 118822",
      "Regina Nordului",
      ["1. As demifond județean 2024"],
      a("NL 2019 1284410", "Nordic Prince", ["1. As demifond NPO"], a("NL 2016 1177200", "North Star"), a("NL 2017 1201188", "Ice Queen")),
      a("RO 2019 447120", "Perla Albastră", ["Soră cu 1. Național"], a("RO 2016 220990", "Albastru Regal"), a("RO 2017 550311", "Ana"))
    ),
  },
];

for (const d of PEDIGREES) {
  const file = join(OUT, `pedigree-${d.slug}.svg`);
  writeFileSync(file, svg(d), "utf8");
  console.log("scris", file);
}
console.log(`\n${PEDIGREES.length} pedigree-uri demonstrative generate.`);
