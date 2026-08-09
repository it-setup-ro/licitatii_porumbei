# Review Log — Dosar de cerințe „No.1 & Best Pigeons"
> Jurnalul buclei Research Agent ↔ Review Agent (format feedback conform brief §4.4; verdicte: APPROVED / NEEDS_REVISION).

## Runda 0
Dosar inițial produs (research-report.md, feature-matrix.md, open-questions.md), în așteptarea review-ului.

## Runda 1 — Review
**Data:** 2026-08-09 | **Review Agent** | **Verdict: NEEDS_REVISION** (1 major, 3 minore, 0 blocker)

### Metodă de verificare prin sondaj
- **PigeonBoss:** WebFetch direct pe https://pigeonboss.com/, https://pigeonboss.com/our-services/, https://pigeonboss.com/famous-fanciers/ — toate accesibile.
- **PIPA:** WebFetch pe https://auctions.pipa.be/en a returnat **HTTP 403** (confirmă limitarea documentată de Research Agent). Compensat prin curl cu user-agent de browser (metoda documentată în research-notes/pipa.md): descărcat homepage, FAQ, /en/upcoming-auctions și pagina licitației Victoria Falls.
- **iPigeon (sursă secundară):** WebFetch pe https://www.newipigeon.com/product/view/54009 — accesibil.

### Afirmații verificate și CONFIRMATE (sondaj)
- PigeonBoss NU e platformă de licitații; meniu identic cu cel raportat; promovare licitații externe („supply your auction link"); pachete €49,95 / €99,95 / €195,95; pagină crescător dedicată **€195/an** („for just €195 per year!"); directorul Famous Fanciers include Alexandru Huzu. [WebFetch 2026-08-09]
- PIPA homepage: secțiuni „Online auctions" + „Upcoming auctions", mesaj „There are currently no online auctions.", selector „Time zone:" în header, linkuri /en/my-favourites, /en/message-center, /en/general-terms, /en/pipa-privacy-policy, /en/user/login|register|password, FAQ cu pill_id-uri în footer; fără link de arhivă „closed" în footer (marcajul ❓ din feature-matrix e onest). [curl 2026-08-09]
- PIPA FAQ: „Bidding starts at 200 euro", „Only one profile can be made per person", apel telefonic de aprobare + „limited budget", depozit pentru țări noi, buying order (prioritate față de bid egal, first-come la egalitate, invizibil, buton „Change b.o."), anti-sniping +5 min per lot („will still end at 17:00" pentru celelalte loturi), taxă administrativă 80 EUR/porumbel, plată în 7 zile calendaristice, notificări outbid email/SMS, **20% buyer's premium** la hibride. [curl 2026-08-09]
- PIPA tehnic: meta Generator „Drupal 10", `vue-wrap`, Plausible — confirmate în HTML. Pagina Victoria Falls afișează „This is an upcoming auction. All pigeons will be visible when bidding starts." [curl 2026-08-09]
- iPigeon lot 54009: inel Belg.4184867-2019, Hen, 6 poze, secțiune video, pedigree PDF, „Porsche 911", „1st National Ace" — modelul de date din raport §4.1 e susținut. Bonus observat: pagina afișează **16 bids / 8 bidders** — susține și cerința „istoric oferte pe lot" (marcată acum doar „propunere proprie"). [WebFetch 2026-08-09]

### Discrepanțe

```
[SEVERITATE: major]
[SECȚIUNE: research-report.md §1 (Diferențiatori, pct. 1) + §9 (risc 4) + open-questions.md F.23]
[TIP: nesusținut + omisiune]
Descriere: Afirmația „nicio platformă de licitații de porumbei nu e construită «Romania-first» cu deschidere internațională" este nesusținută și contrazisă de realitate: există un ecosistem întreg de platforme românești de licitații de porumbei — BestPigeons.ro („Licitații Online cu Porumbei de Performanță din România"), licitatie-porumbei.ro, licitatiiporumbei.ro, piatadeporumbei.ro, goldpigeon.ro, topvoiajor.ro, porumbei360.ro, magicpigeons.com, onlyolr.com. Raportul citează chiar „BestPigeons 25%" în tabelul de comisioane (§5.1) fără a semnala că brandul există și pe piața RO ca concurent direct. Omisiune conexă: peisajul concurențial românesc lipsește complet din dosar (relevant direct pentru diferențiatori și pentru riscul 4 — lichiditate la lansare). Risc suplimentar de brand: open-questions #23 propunea ca exemplu de domeniu „bestpigeons.ro" — domeniu deja ocupat de un concurent activ; numele „No.1 & Best Pigeons" e periculos de apropiat de „BestPigeons.ro".
Dovadă/Referință: WebSearch 2026-08-09 „licitatii porumbei online Romania site platforma" → https://www.bestpigeons.ro/, https://www.licitatie-porumbei.ro/, https://piatadeporumbei.ro/, https://goldpigeon.ro/, https://topvoiajor.ro/licitatie-porumbei-voiajori-sport/ etc.; research-notes/business-legal.md §1.1 (rândul BestPigeons.com).
Acțiune cerută: (1) Reformularea diferențiatorului 1 cu trasabilitate reală (ex. diferențiere prin bilingvism nativ + plăți integrate + experiență premium, NU prin pretinsa absență a concurenței RO). (2) Adăugarea în raport a unei sub-secțiuni scurte de peisaj concurențial RO (listă + ce model folosesc, măcar la nivel de sondaj). (3) Corelarea riscului 4 (lichiditate) cu existența concurenței locale. (4) Eliminarea exemplului de domeniu „bestpigeons.ro" din open-questions #23 — corectat deja de Review Agent în open-questions.md (singura editare permisă) + întrebare nouă despre verificarea de marcă.
```

```
[SEVERITATE: minor]
[SECȚIUNE: research-report.md §1 și §2.1 și §8 (faza 3); feature-matrix.md §1; research-notes/pipa.md §1]
[TIP: greșit]
Descriere: Se afirmă repetat că PIPA operează în „9 limbi". HTML-ul homepage conține 10 versiuni lingvistice (hreflang: en, zh-hans, ja, nl, fr, de, es, pl, ar, ro). Nota pipa.md §1 chiar enumeră 10 limbi dar le numără „9".
Dovadă/Referință: curl https://auctions.pipa.be/en 2026-08-09 — atribute hreflang="en|zh-hans|ja|nl|fr|de|es|pl|ar|ro" (10 valori distincte).
Acțiune cerută: Corectarea numărului la 10 în toate cele 4 locuri (raport §1 rezumat + §2.1 + §8, feature-matrix §1) și în pipa.md.
```

```
[SEVERITATE: minor]
[SECȚIUNE: research-report.md §2.1 (rând FAQ) vs feature-matrix.md §7 vs research-notes/pipa.md §2, §6.10]
[TIP: contradicție (internă, minoră)]
Descriere: Numărul/lista categoriilor FAQ diferă între documente: raportul §2.1 listează 6 categorii (Înregistrare, Licitare, Notificări, Plată, Transport, Aftersales — lipsește „My Auctions" din footer), footer-ul PIPA are 7 categorii cu pill_id, iar pagina FAQ completă are 10 (pipa.md §6.10; feature-matrix spune „10 categorii").
Dovadă/Referință: curl homepage 2026-08-09 — 7 linkuri pill_id în footer; pipa.md §6.10 — 10 categorii pe pagina FAQ.
Acțiune cerută: Armonizare: raportul să spună explicit „7 categorii în footer, 10 pe pagina FAQ" (sau o singură formulare consistentă în ambele fișiere).
```

```
[SEVERITATE: minor]
[SECȚIUNE: feature-matrix.md §4 (rând „Rating vânzători", coloana PIPA)]
[TIP: nesusținut (ușor)]
Descriere: Legenda definește ❌ = „absent (verificat)", dar absența ratingului la PIPA nu a fost verificată pozitiv (fără cont, fără licitații active); e o deducție rezonabilă din FAQ + harta site-ului, nu o verificare.
Dovadă/Referință: research-notes/pipa.md — nicio mențiune de rating în FAQ/harta site; dar paginile de cont nu au fost văzute din interior.
Acțiune cerută: Fie ⚙️/❓ cu notă „nemenționat în FAQ/harta site-ului", fie păstrarea ❌ cu o notă de subsol care precizează baza deducției.
```

### Verificare constrângeri fixe (brief §5) și elemente obligatorii
- **Bilingv RO/EN:** respectat (raport §7 i18n, glosar §4.5, comutator limbă M în §2.1). ✔
- **Platformă completă** (conturi, live real-time, plăți/comision, notificări, proxy-bidding, istoric, rating): toate acoperite ca M în §2 și §7. ✔
- **Custom full-stack** (React/Next.js + WebSockets): respectat, §7, marcat propunere proprie cu justificare. ✔
- **Paleta din logo:** acoperită explicit (§6.1, tokens + reguli contrast). ✔
- **Animația „stol la câștig":** acoperită complet (trigger, durată, mobil, reduce-motion — §6.2). ✔
- **Glosar bilingv:** prezent (§4.5, 17 termeni, marcat „de extins în runda 2"). ✔
- **Trasabilitate:** prin sondaj, marcajele [sursă] există la fiecare cerință; golurile (pagina de lot PIPA, arhiva closed, responsive) sunt documentate onest ca ❓, nu inventate. ✔

### Verdict Runda 1
**NEEDS_REVISION** — 0 blocker, **1 major** (diferențiatorul „Romania-first" nesusținut + omisiunea concurenței RO), 3 minore. Majorul trebuie rezolvat de Research Agent în Runda 2. Minorele: #2 (număr limbi) și #3 (categorii FAQ) sunt corecturi factuale simple de făcut în Runda 2; #4 (legenda ❌) e acceptabilă și cu o simplă notă de subsol. Partea de decizie a clientului din major (verificare marcă/domeniu vs BestPigeons.ro) a fost mutată de Review Agent în open-questions.md (F.23 corectat + F.25 nou).

## Runda 1 — Corectii aplicate
**Data:** 2026-08-09 | **Research Agent (Runda 2)** | Toate discrepanțele (1 major + 3 minore) adresate.

### Major #1 — „Romania-first" nesusținut + omisiunea concurenței RO — REZOLVAT
- **Re-verificare la sursă:** WebFetch direct 2026-08-09 pe bestpigeons.ro, licitatie-porumbei.ro, piatadeporumbei.ro, goldpigeon.ro — toate accesibile; observațiile de sondaj documentate în fișier nou **research-notes/concurenta-ro.md** (site-urile neverificate direct — licitatiiporumbei.ro, topvoiajor.ro, porumbei360.ro, magicpigeons.com, onlyolr.com — sunt marcate explicit ca provenind doar din WebSearch).
- research-report.md §1: afirmația „nicio platformă nu e construită Romania-first" **retrasă**; diferențiatorul 1 reformulat cu trasabilitate reală (bilingvism RO/EN nativ + mecanici de nivel PIPA vs concurență RO monolingvă/fără plăți integrate, sursă: concurenta-ro.md §4).
- research-report.md §1: adăugată sub-secțiune nouă „Peisajul concurențial românesc (corectat în Runda 2)" cu cele 4 site-uri verificate + cele 5 neverificate, la nivel de sondaj.
- research-report.md §9 risc 4: lichiditatea la lansare corelată explicit cu existența alternativelor locale funcționale + mitigare (comision promoțional, listare asistată, vizibilitate EN).
- research-report.md §5.1: rândul „BestPigeons 25%" acum semnalează explicit că brandul e activ și pe piața RO ca bestpigeons.ro (concurent direct).
- open-questions.md #23 + #25: fuseseră deja corectate/adăugate de Review Agent — lăsate neatinse; research-report §1 trimite acum la ele.

### Minor #2 — „9 limbi" → „10 limbi" — REZOLVAT (toate cele 5 locuri)
- research-report.md §1 (rezumat), §2.1 (rând comutator limbă, cu lista hreflang completă), §8 faza 3; feature-matrix.md §1 (rând Multi-limbă, cu hreflang + sursă curl 2026-08-09); research-notes/pipa.md §1 (cu notă de corecție care păstrează trasabilitatea numărării inițiale greșite).

### Minor #3 — categorii FAQ inconsistente — REZOLVAT (formulare unică)
- Formularea armonizată în ambele fișiere: „7 categorii cu link în footer, 10 în total pe pagina FAQ". research-report.md §2.1 (rândul FAQ enumeră acum cele 7 din footer + menționează 10 pe pagina FAQ); feature-matrix.md §7 (rând FAQ actualizat, sursă curl homepage 2026-08-09 adăugată).

### Minor #4 — ❌ „Rating vânzători" PIPA nesusținut ca verificare — REZOLVAT (varianta notă de subsol)
- feature-matrix.md §4: marcaj schimbat în „❌*" + notă de subsol nouă care precizează baza deducției (rating nemenționat în FAQ-ul citit integral și în harta site-ului; paginile de cont neobservate din interior).
- research-report.md §2.2: rândul „Rating vânzători" reformulat consecvent (absența la PIPA = deducție, nu verificare).

### Alte actualizări de trasabilitate
- Antetele research-report.md și feature-matrix.md trecute la „Runda 2 (corecții după review Runda 1)".
- Fișier nou: research-notes/concurenta-ro.md (metodă, tabel de observații per site cu URL + dată, sinteză competitivă).

**Stare:** dosarul Rundei 2 e gata pentru re-review (verdict așteptat de la Review Agent).

## Runda 2 — Review
**Data:** 2026-08-09 | **Review Agent** | **Verdict: APPROVED** (0 blocker, 0 major, 5 minore — toate acceptate cu justificare)

### Metodă de verificare prin sondaj
- **PigeonBoss:** WebFetch direct pe https://pigeonboss.com/ și https://pigeonboss.com/famous-fanciers/ — ambele accesibile.
- **PIPA:** WebFetch pe https://auctions.pipa.be/en → **HTTP 403** (limitarea documentată se confirmă și în Runda 2). Compensat prin curl cu user-agent de browser: homepage (59 KB, OK din prima) și FAQ (prima cerere a returnat challenge Cloudflare „Just a moment…" 5,7 KB — documentat; a doua cerere simplă, cu referer, a returnat pagina completă de 209 KB; NU s-a rezolvat niciun captcha).
- **Concurența RO (afirmațiile noi din Runda 2):** WebFetch direct pe https://www.bestpigeons.ro/.

### Afirmații verificate și CONFIRMATE (sondaj Runda 2)
- **PigeonBoss:** portal editorial + shop + servicii de promovare, NU platformă de licitații („connects sellers to buyers rather than hosting auctions directly"); pachete Single Boost €49,95 / Power Pack €99,95 / VIP Spotlight €195,95; pagină de crescător „for just €195 per year!"; Alexandru Huzu listat la Famous Fanciers; meniu identic cu cel raportat (Home, Contact, Famous Fanciers, One Loft Races, Services, Shop, Tips, News, My Account). [WebFetch 2026-08-09]
- **PIPA homepage:** exact 10 versiuni hreflang (en, zh-hans, ja, nl, fr, de, es, pl, ar, ro) — corecția „10 limbi" din Runda 2 e corectă; selector „Time zone"; secțiuni „Online auctions" + „Upcoming auctions" + mesaj „no online auctions"; exact 7 linkuri FAQ cu pill_id în footer (1, 3, 16671, 11, 5, 7, 9) — formularea armonizată „7 în footer, 10 pe pagina FAQ" e susținută; linkuri my-favourites, message-center, general-terms, privacy prezente. [curl 2026-08-09]
- **PIPA FAQ (grep pe HTML descărcat):** „Bidding starts at 200 euro"; „one profile can be made per person"; „buying order" (12 apariții) + buton „Change b.o."; anti-sniping „extended by another 5 minutes" per lot, cu exemplul oficial 16:57→„extended to 17:05" în timp ce „the auction for all other pigeons… will still end at 17:00"; „80 euro" taxă administrativă (3 apariții); plată „7 calendar days"; outbid „(SMS) and/or email… free of charge, anywhere in the world"; validare telefon prin cod SMS („I did not receive a validation code through SMS", revalidare la schimbarea numărului); adrese de facturare „checked and validated by our auction administrators"; background check „may take up to 48 hours"; buget per cont („total amount in EUR you can spend per auction weekend") + „deposit before approving your account"; licitații hibride: countdown online de 30 secunde resetat de fiecare bid + „knocked down" + „20% buyer's premium… total amount of 120% is exclusive of VAT"; aftersales: infertil „within two months after receipt", bolnav/mort „24 hours after receipt/receiving the pigeon". Bonus tehnic observat în HTML: config „pipa_realtime" cu server push Node.js (push.pipa.be) — întărește justificarea stratului real-time din raport §7. [curl 2026-08-09]
- **bestpigeons.ro:** platformă românească de licitații de porumbei, titlu exact „BestPigeons.ro – Licitații Online cu Porumbei de Performanță din România", doar RO la sondaj, fără plăți online/proxy-bidding vizibile — constatările din research-notes/concurenta-ro.md și research-report §1 sunt susținute. [WebFetch 2026-08-09]

### Verificare rezolvarea discrepanțelor din Runda 1
- **Major #1 (Romania-first / concurența RO):** REZOLVAT — afirmația retrasă, sub-secțiune de peisaj concurențial adăugată în §1 cu fișier-sursă nou (concurenta-ro.md, cu separare onestă verificat/neverificat), riscul 4 corelat, rândul „BestPigeons 25%" semnalizat, open-questions #23/#25 la locul lor. ✔
- **Minor #2 (9→10 limbi):** REZOLVAT în toate locurile verificate (raport §1/§2.1/§8, feature-matrix §1); numărul 10 confirmat direct pe HTML. ✔
- **Minor #3 (categorii FAQ):** REZOLVAT — formulare unică „7 categorii cu link în footer, 10 în total pe pagina FAQ", confirmată de cele 7 pill_id din footer. ✔
- **Minor #4 (❌ rating PIPA):** REZOLVAT — „❌*" + notă de subsol în feature-matrix §4 + reformulare consecventă în raport §2.2. ✔

### Verificare constrângeri fixe (brief §5) și elemente obligatorii
- **Bilingv RO/EN cu comutator:** respectat (raport §2.1 M, §7 i18n, glosar §4.5). ✔
- **Platformă completă** (conturi, licitații live real-time, plăți/comision, notificări, proxy-bidding, istoric, rating vânzători): toate M în §2/§7. ✔
- **Custom full-stack** (Next.js/React + WebSockets, nu WordPress): respectat, §7, marcat propunere proprie cu justificare. ✔
- **Paleta din logo:** acoperită explicit cu tokens + reguli de contrast WCAG (§6.1). ✔
- **Animația „stol la câștig":** completă — trigger, durată, comportament mobil, prefers-reduced-motion (§6.2). ✔
- **Glosar bilingv:** prezent, 17 termeni RO/EN cu surse (§4.5). ✔
- **Cerințe nerealiste tehnic:** nu s-au găsit; arhitectura §7 (tranzacție serializată per lot, timestamp server ca autoritate, anti-sniping decis atomic) e fezabilă și aliniată practicii; tiparul „strat real-time separat" e chiar confirmat la PIPA (push.pipa.be).

### Discrepanțe rămase (toate minore, acceptate — nu blochează aprobarea)

```
[SEVERITATE: minor]
[SECȚIUNE: research-report.md §2.2 (istoric oferte), §4.2 (pedigree), §4.5 (glosar), §5.4 (GDPR), §9 risc 1]
[TIP: contradicție (formulare stală)]
Descriere: Documentul e la „Runda 2", dar cinci pasaje încă promit închiderea golurilor „în runda 2" (ex. „de închis în runda 2", „de extins în runda 2", „cercetare de completat cu surse în runda 2"), deși Runda 2 a tratat doar cele 4 discrepanțe din review. Referințele „runda 2" sunt de fapt „rundă/fază viitoare".
Dovadă/Referință: research-report.md (textul secțiunilor citate) vs. antetul „Versiune: Runda 2".
Acțiune cerută (opțională, la prima editare): înlocuirea formulării cu „fază următoare / de completat înainte de implementare". ACCEPTAT ca minor: golurile sunt documentate onest (principiul „onestitate asupra incertitudinii", brief §10), iar conținutul afectat nu introduce cerințe nesusținute.
```

```
[SEVERITATE: minor]
[SECȚIUNE: research-report.md §2.2 rând „Istoric oferte pe lot"; feature-matrix.md §3 rând „Istoric public al ofertelor"]
[TIP: omisiune (trasabilitate disponibilă neintegrată)]
Descriere: Cerința e marcată doar „P — propunere proprie", deși review-ul Rundei 1 a furnizat dovadă de piață (iPigeon lot 54009 afișează „16 bids / 8 bidders"). Marcajul actual e conservator, nu greșit.
Dovadă/Referință: review-log.md Runda 1, secțiunea „Afirmații verificate", ultima buliță (WebFetch 2026-08-09).
Acțiune cerută (opțională): upgrade sursă la „R (iPigeon) + P". ACCEPTAT ca minor: sub-atribuirea unei surse nu încalcă trasabilitatea (regula interzice supra-atribuirea, nu prudența).
```

```
[SEVERITATE: minor]
[SECȚIUNE: open-questions.md antet]
[TIP: contradicție (versionare)]
Descriere: Antetul spune „Versiune: Runda 1" deși fișierul conține deja corecturile Review Agent din Runda 1 (#23 corectat, #25 adăugat) și e coerent cu dosarul Rundei 2.
Dovadă/Referință: open-questions.md rândul 2 vs. conținutul #23/#25.
Acțiune cerută (opțională): actualizarea antetului la următoarea editare de conținut. ACCEPTAT ca minor: pur cosmetic; conținutul e la zi. (Review Agent nu l-a modificat: editarea permisă a open-questions.md e limitată la mutarea deciziilor de client, ceea ce nu e cazul aici.)
```

```
[SEVERITATE: minor]
[SECȚIUNE: research-report.md §5.4 (GDPR) + research-notes/business-legal.md §4 (nescrisă)]
[TIP: omisiune (gol documentat)]
Descriere: Detaliile GDPR (surse pe temeiuri legale, retenție, DPA) rămân la nivel de checklist fără surse dedicate; secțiunea 4 din business-legal.md e nescrisă. Checklist-ul din raport acoperă însă obligațiile-cheie, iar aspectele care cer specialiști sunt deja în open-questions E.19–21.
Dovadă/Referință: research-report.md §5.4 (auto-declarat „gol documentat"); open-questions.md secțiunea E.
Acțiune cerută: completarea surselor GDPR înainte de faza de implementare (nu blochează dosarul de cerințe). ACCEPTAT ca minor: golul e declarat explicit, nu prezentat drept fapt.
```

```
[SEVERITATE: minor]
[SECȚIUNE: research-report.md §4.2 (pedigree 4–5 generații)]
[TIP: nesusținut (ușor, auto-declarat)]
Descriere: Convenția „arbore pe 4–5 generații" e marcată chiar de Research Agent drept „convenție de domeniu în curs de confirmare cu sursă suplimentară". Minimul MVP (PDF pedigree, observat direct pe iPigeon) e însă susținut, deci cerința construibilă nu depinde de cifra exactă.
Dovadă/Referință: research-report.md §4.2; research-notes/date-porumbei.md §2.
Acțiune cerută: confirmarea cu o sursă de domeniu (ex. software de pedigree columbofil) înainte de designul arborelui interactiv (faza 2). ACCEPTAT ca minor: marcat onest ca neconfirmat, nu prezentat drept fapt.
```

### Mutări în open-questions.md
Niciuna necesară în Runda 2: cele 5 minore de mai sus sunt editoriale/de research, nu decizii de client; deciziile de client identificate anterior sunt deja centralizate în open-questions.md (#1–#25).

### Verdict Runda 2
**APPROVED** — 0 blocker, 0 major, 5 minore acceptate cu justificare (vezi mai sus). Toate discrepanțele Rundei 1 au fost verificate ca rezolvate la sursă. Prin sondaj, fiecare afirmație verificată despre PIPA, PigeonBoss și bestpigeons.ro s-a confirmat; constrângerile fixe (brief §5) și elementele obligatorii (paleta din logo, animația „stol la câștig", glosarul bilingv) sunt acoperite explicit. Conform criteriilor de oprire (brief §4.5), bucla se închide: dosarul e considerat FINAL.
