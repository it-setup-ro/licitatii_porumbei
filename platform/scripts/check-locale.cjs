#!/usr/bin/env node
/**
 * Verifică un fișier de traducere față de engleză: aceleași chei, aceleași
 * locuri de completat ({price}, {count}…), sintaxă ICU corectă.
 *
 *   node scripts/check-locale.cjs de        # un fișier
 *   node scripts/check-locale.cjs --all     # toate limbile
 *
 * Ieșire 0 = în regulă; 1 = probleme (listate).
 */
const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "..", "messages");
let parse = null;
try {
  parse = require("@formatjs/icu-messageformat-parser").parse;
} catch {
  // fără parser: se verifică doar acoladele
}

function flatten(obj, prefix = "", out = new Map()) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object") flatten(v, key, out);
    else out.set(key, v);
  }
  return out;
}

/** Numele argumentelor dintr-un mesaj ICU, inclusiv din plural / select. */
function argNames(message) {
  const names = new Set();
  if (!parse) {
    for (const m of message.matchAll(/\{\s*([A-Za-z0-9_]+)/g)) names.add(m[1]);
    return names;
  }
  const walk = (els) => {
    for (const el of els) {
      if (el.value !== undefined && typeof el.value === "string" && el.type !== 0 && el.type !== 7) names.add(el.value);
      if (el.options) for (const opt of Object.values(el.options)) walk(opt.value);
      if (el.children) walk(el.children);
    }
  };
  walk(parse(message, { ignoreTag: true }));
  return names;
}

function check(locale) {
  const en = flatten(JSON.parse(fs.readFileSync(path.join(dir, "en.json"), "utf8")));
  const file = path.join(dir, `${locale}.json`);
  if (!fs.existsSync(file)) return [`lipsește ${locale}.json`];
  let tr;
  try {
    tr = flatten(JSON.parse(fs.readFileSync(file, "utf8")));
  } catch (e) {
    return [`JSON invalid: ${e.message}`];
  }
  const problems = [];
  for (const [key, value] of en) {
    if (!tr.has(key)) {
      problems.push(`lipsește cheia ${key}`);
      continue;
    }
    const t = tr.get(key);
    if (typeof t !== "string" || !t.trim()) {
      problems.push(`gol sau nu e text: ${key}`);
      continue;
    }
    let a, b;
    try {
      a = argNames(value);
    } catch {
      continue; // engleza însăși nu se parsează — nu e vina traducerii
    }
    try {
      b = argNames(t);
    } catch (e) {
      problems.push(`sintaxă ICU greșită în ${key}: ${e.message}`);
      continue;
    }
    const lipsa = [...a].filter((x) => !b.has(x));
    const inPlus = [...b].filter((x) => !a.has(x));
    if (lipsa.length || inPlus.length) {
      problems.push(`argumente diferite în ${key}: lipsă [${lipsa.join(", ")}] în plus [${inPlus.join(", ")}]`);
    }
  }
  for (const key of tr.keys()) if (!en.has(key)) problems.push(`cheie în plus ${key}`);
  return problems;
}

const arg = process.argv[2];
const locales = arg === "--all"
  ? fs.readdirSync(dir).filter((f) => f.endsWith(".json") && f !== "en.json").map((f) => f.replace(/\.json$/, ""))
  : [arg];

let failed = false;
for (const loc of locales) {
  const problems = check(loc);
  if (problems.length) {
    failed = true;
    console.log(`✗ ${loc}: ${problems.length} probleme`);
    for (const p of problems.slice(0, 40)) console.log("   " + p);
  } else {
    console.log(`✓ ${loc}`);
  }
}
process.exit(failed ? 1 : 0);
