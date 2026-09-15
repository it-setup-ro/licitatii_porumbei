---
name: batch-edits
description: Tipar pentru modificări în mai multe fișiere ale platformei No.1 & Best Pigeons dintr-o singură trecere — script Python cu ancore exacte și script Node pentru textele RO/EN. Folosește la orice funcție care atinge peste 3 fișiere.
---

# Modificări în serie

## 1. Codul — script Python cu ancore

Scrie în scratchpad `stage_x_edits.py`. Fiecare pereche `(vechi, nou)` e înlocuită o singură dată; dacă ancora lipsește, scriptul se oprește și spune unde — nimic nu se aplică pe jumătate în acel fișier.

```python
import io
ROOT = r"C:/Users/daniel/Downloads/Pagina licitatii porumbei/platform/"

def edit(path, pairs, label):          # label e obligatoriu
    p = ROOT + path
    s = io.open(p, encoding="utf-8").read()
    for old, new in pairs:
        if old not in s:
            raise SystemExit(f"[{label}] nu am gasit: {old[:90]!r}")
        s = s.replace(old, new, 1)
    io.open(p, "w", encoding="utf-8").write(s)
    print(label, "ok")
```

- Ancorele se copiază **exact** din fișier (citește porțiunea înainte).
- Pentru importuri: adaugă linia la început (după `"use client";` dacă există).
- Dacă scriptul se oprește la mijloc, fișierele de dinainte sunt deja modificate: reia doar de la eșec (nu rula tot din nou — ancorele vechi nu mai există).
- Rulează: `python "<scratchpad>/stage_x_edits.py" 2>&1 | grep -v SyntaxWarning`.

## 2. Textele — script Node

```js
const fs = require("fs");
const root = "C:/Users/daniel/Downloads/Pagina licitatii porumbei/platform/messages";
const add = { ro: { ns: { key: "text" } }, en: { ns: { key: "text" } } };
for (const loc of ["ro", "en"]) {
  const file = `${root}/${loc}.json`;
  const m = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const [ns, keys] of Object.entries(add[loc])) m[ns] = Object.assign(m[ns] || {}, keys);
  fs.writeFileSync(file, JSON.stringify(m, null, 2) + "\n");
}
```

Pluraluri românești: `{count, plural, one {un lot} few {# loturi} other {# de loturi}}`.

## 3. Verificare, în ordinea asta

`npx tsc --noEmit` → `npx eslint <fișierele atinse>` → `npm test` → e2e țintit (skill `e2e`).
