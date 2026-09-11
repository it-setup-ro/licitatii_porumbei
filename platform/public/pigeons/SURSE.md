# Pozele și pedigree-urile demonstrative

## Poze (`voiajor-*.jpg`)

Fotografii de la expoziția **NPA National 2026**, publicate pe Wikimedia Commons
sub licența **CC0 1.0** (renunțare la drepturi — se pot folosi liber, inclusiv
comercial, **fără obligație de atribuire**). Le-am ales tocmai ca să nu rămână
nicio obligație legală agățată de site.

Toate au fost reîncadrate la 1400×1050, pe fundal neutru, fără să fie tăiată
pasărea.

| Fișier | Original pe Wikimedia Commons |
|---|---|
| `voiajor-vanat-bara.jpg` | Exhibition Homer pigeon blue bar NPA National 2026 01 23 |
| `voiajor-grizzle.jpg` | Racing Homer pigeon grizzle NPA National 2026 01 23 |
| `voiajor-vanat-pestrit.jpg` | Show Homer pigeon blue check NPA National 2026 01 23 |
| `voiajor-robust.jpg` | Giant Homer pigeon blue bar NPA National 2026 01 23 |
| `voiajor-alb-sa.jpg` | Saddle Homer pigeon blue check NPA National 2026 01 23 |
| `voiajor-alb-bara.jpg` | Saddle Homer pigeon white bar NPA National 2026 01 23 |
| `voiajor-deschis.jpg` | Show Homer pigeon light red bar NPA National 2026 01 23 |

Sunt porumbei reali, dar **nu sunt porumbeii din loturile demo** — datele lotului
(nume, inel, palmares) sunt inventate. Înainte de lansare se înlocuiesc cu
pozele reale ale păsărilor scoase la licitație.

## Poze de fundal (`hero-stol.jpg`, `banda-stol.jpg`)

Stoluri de porumbei pe cer senin, fotografiate de Sonia Sevilla, publicate pe
Wikimedia Commons sub **CC0 1.0** (fara obligatie de atribuire).

| Fisier | Original pe Wikimedia Commons | Decupaj |
|---|---|---|
| `hero-stol.jpg` | Pigeon racing - afternoon - Nishapur 11.JPG | 2200x1000, stolul ramane in dreapta, cerul liber in stanga pentru text |
| `banda-stol.jpg` | Pigeon racing - afternoon - Nishapur 09.JPG | 2200x700 |

Sunt poze reale, dar nu de la o cursa de-a noastra. Cand avem fotografii
proprii (lansare, columbodrom, crescatorie), se inlocuiesc — asta e tot ce
trebuie schimbat, numele fisierelor raman.

## Pedigree-uri (`pedigree-*.svg`)

Generate de `scripts/pedigrees.mjs`, cu date **complet fictive**: inele, nume de
strămoși și rezultate inventate. Sunt desenate în forma unui pedigree adevărat
de crescătorie (fișa păsării + arbore pe trei generații + palmares), pentru ca
prezentarea să arate realist, dar fiecare poartă jos mențiunea
**„DOCUMENT DEMONSTRATIV"**.

Nu imită documentul niciunei federații reale (FCI, FCR, FCB) — un pedigree este
oricum documentul crescătoriei, nu al federației.

Regenerare după modificarea datelor:

```bash
node scripts/pedigrees.mjs
```

## Cum ajung pe loturi

`scripts/demo-media.mjs` le atașează celor șapte loturi demo, identificate după
seria inelului. Scriptul **nu șterge nimic**: înlocuiește doar schițele vechi
(`/pigeons/pN.svg`) și sare peste orice lot care are fișiere urcate de un
utilizator.

```bash
node scripts/demo-media.mjs
```
