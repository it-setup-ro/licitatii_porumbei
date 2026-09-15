---
name: e2e
description: Rulează și depanează testele Playwright ale platformei No.1 & Best Pigeons — țintit sau complet, în fundal, cu citirea eșecurilor din jurnal. Folosește după orice schimbare vizibilă în site sau API.
---

# Testele end-to-end

Rulează din `platform/`. Playwright pornește singur `next dev -p 3100` pe baza `nbp_test`, aplică migrările, face seed și fixează setările vechilor teste (`tests/e2e/fixtures/pin-test-settings.ts`). Nu porni în paralel serverul de dev (conflict de blocare `.next`).

1. **Țintit** (după o schimbare locală): specurile atinse + cele care folosesc aceleași testid-uri (`grep -rn "<testid>" tests/e2e`).
2. **Complet** (~9 min, 230 teste) înainte de commit pentru schimbări largi. Mereu în fundal, cu jurnal în scratchpad:

```bash
npx playwright test [spec...] --reporter=line > <scratchpad>/e2e.log 2>&1; echo "EXIT=$?" >> <scratchpad>/e2e.log
```

3. **Rezumat și eșecuri** (fără să citești tot jurnalul, care are și cererile serverului):

```bash
L=<scratchpad>/e2e.log
grep -E "^\s+[0-9]+ (passed|failed|flaky|did not run)|EXIT=" "$L"
grep -nE "^\s+[0-9]+\) " "$L"
n=$(grep -nE "^\s+1\) " "$L" | head -1 | cut -d: -f1); sed -n "$n,$((n+30))p" "$L" | grep -v WebServer
```

Instantaneul paginii la eșec: `test-results/<nume>/error-context.md` (caută testid-urile, nu citi antetul).

4. **Rerulează doar ce a picat**: `npx playwright test tests/e2e/x.spec.ts:LINIE`. Un grup `describe.configure({ mode: "serial" })` sare restul testelor după primul eșec („did not run").

## Cauze frecvente (verifică-le înainte să schimbi codul)

- Câmp React completat înainte de hidratare → `expect(async () => { fill; expect(toHaveValue) }).toPass()`.
- Clic urmat imediat de `goto` → așteaptă răspunsul (`waitForResponse`).
- Baza comună: alt test a creat date care împing elementul căutat din listă.
- Avizul de 30 min pleacă imediat dacă lotul pornește deja în fereastră → mută finalul după ofertă (`fixtures/lot-ends-soon.ts`).
- Închiderea unei licitații: `/api/admin/lots/<id>/shorten` + sweeper (15 s) → `toPass` până la ~150 s.
