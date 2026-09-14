# Cerințe — licitații pe părți, după modelul PIPA

**Versiunea 2** · 14 septembrie 2026
**Pornește de la:** mesajele vocale ale clientului (pigeon2–4), documentul generat din video, licitația Frații Alpdag de pe PIPA și platforma construită până acum.

> **Ce s-a schimbat față de documentul din video**
> 1. Crescătorul **poate pregăti** porumbeii, dar nimic nu ajunge pe site fără administrator. Administratorul poate introduce și el porumbei în numele crescătorului. *(propunere — de confirmat cu clientul)*
> 2. **Prelungirea** se setează, nu mai e fixată la 10 minute: o valoare pentru tot site-ul, care se poate schimba pe o licitație anume.
> 3. **Taxele** se setează: pentru tot site-ul, cu posibilitatea de a le schimba pe o licitație anume. Se afișează înainte de licitare și se îngheață la pornirea părții.
> 4. **„Închiderea mai devreme" se înlocuiește** cu retragerea unui porumbel și anularea unei licitații, ambele fără câștigător. *(clientul a cerut-o explicit în pigeon2 — de discutat cu el)*
>
> Marcajele din text: **[CONFIRMAT]** = spus de client · **[PROPUNERE]** = de confirmat cu clientul · **[EXISTĂ]** = deja construit pe platformă

---

## 1. Structura

```
Crescător
  └─ Licitație
       └─ Partea 1, Partea 2, …      (maximum 20 de porumbei pe parte)
            └─ Porumbel 1.01, 1.02, …
                 └─ Oferte
```

- **Crescătorul** e profilul celui care vinde: nume, localitate, țară, fotografie, poveste, rezultate.
- **Licitația** aparține unui singur crescător. **[CONFIRMAT]**
- **Partea** grupează porumbeii care pornesc și se închid împreună. Fiecare parte are ora ei. **[CONFIRMAT]**
- **Porumbelul** se licitează separat, cu prețul, istoricul și câștigătorul lui. **[CONFIRMAT]**
- **Numerotarea** e automată, parte.poziție: `1.01`, `1.02`, `2.01`. Ordinea se poate schimba cât partea nu a pornit.
- Pe site grupul se numește **„Partea"**, ca la PIPA, unde „lot" înseamnă un singur porumbel. *(de confirmat denumirea)*

---

## 2. Cine ce face

### 2.1. Administratorul **[CONFIRMAT]**

- creează și editează crescători, licitații și părți;
- adaugă porumbei în orice parte, inclusiv în numele unui crescător;
- aprobă sau respinge porumbeii pregătiți de crescători;
- **pornește partea** — singurul care o poate face;
- retrage un porumbel sau anulează o licitație (vezi capitolul 6);
- vede ofertele în timp real, câștigătorii și exportă rezultatele.

### 2.2. Crescătorul **[PROPUNERE]**

**De ce propunem:** o parte cu 20 de porumbei înseamnă 20 de fișe, fiecare cu fotografii, fotografia ochiului, pedigree, video, rezultate și caracteristici. Dacă totul trece prin administrator, el devine gâtuirea platformei. Crescătorul are deja datele și pozele.

**Ce rămâne neschimbat față de ce a cerut clientul:** nimic nu apare pe site fără administrator, iar partea o pornește doar el.

Fluxul **în ambele sensuri**:

| Pas | Cine | Ce se întâmplă |
|---|---|---|
| 1 | administratorul | creează licitația și părțile pentru crescător |
| 2 | crescătorul **sau** administratorul | adaugă și completează fișele porumbeilor. Oricare dintre ei poate continua ce a început celălalt. |
| 3 | crescătorul | trimite partea la verificare |
| 4 | administratorul | corectează ce e nevoie, aprobă porumbeii |
| 5 | administratorul | pornește partea — toți porumbeii intră deodată |
| 6 | — | **după pornire, crescătorul nu mai poate modifica nimic.** Administratorul poate corecta doar greșeli (o literă din nume, o poză) și modificarea rămâne în jurnal. |

- Setare pe site: **„Crescătorii pot pregăti porumbei: da / nu"**. Pe „nu", doar administratorul introduce porumbei — exact varianta cerută acum de client.
- **[EXISTĂ]** Formularul de porumbel, încărcarea de poze și video, aprobarea și regulile de modificare sunt deja construite. Propunerea le reorganizează, nu le reface.

### 2.3. Cumpărătorul **[EXISTĂ]**

Își face cont, își alege o poreclă, licitează, primește notificări, plătește.

---

## 3. Viața unei părți

```
Ciornă → Trimisă la verificare → Aprobată → Activă → Închisă
                                              ↘ (porumbel) Retras
Licitație:  … → Anulată
```

| Stare | Ce înseamnă |
|---|---|
| **Ciornă** | se completează. Nu se vede pe site. |
| **Trimisă la verificare** | crescătorul a terminat, așteaptă administratorul. *(doar dacă propunerea 2.2 e acceptată)* |
| **Aprobată** | gata de pornire. Se vede în previzualizare. |
| **Activă** | se licitează. Ora de închidere nu se mai poate muta. |
| **Închisă** | fiecare porumbel are câștigătorul lui, sau „nevândut". |

### 3.1. Pornirea **[CONFIRMAT]**

- Un singur buton, **„Pornește partea"**, pune toți porumbeii din parte activi în aceeași clipă.
- Nu se poate porni un porumbel singur.
- **Nu pornește o parte incompletă.** Fiecare porumbel trebuie să aibă cel puțin serie, an, sex, o fotografie și preț de pornire. Butonul arată exact ce lipsește și la care porumbel.
- La pornire se **îngheață** taxele și regulile de prelungire (capitolele 4 și 5).
- *(de confirmat)* Pornirea poate fi pe loc, sau programată pentru o dată și o oră.

### 3.2. Închiderea **[CONFIRMAT]**

- Toți porumbeii dintr-o parte au aceeași oră de închidere, ca la PIPA: Partea 1 la 12:30, Partea 2 la 13:00.
- Fiecare porumbel se poate prelungi separat (capitolul 4). Cei fără oferte târzii se închid la ora stabilită.
- La închidere, câștigătorul se stabilește automat. **[EXISTĂ]**

---

## 4. Prelungirea în ultimele minute

**Regula:** o ofertă venită în ultimele **X** minute prelungește **doar acel porumbel** cu **Y** minute. Se repetă la fiecare ofertă nouă din intervalul prelungit.

| Setare | Unde | Valoare implicită |
|---|---|---|
| Fereastra X (câte minute înainte de final) | tot site-ul | 10 min — cerut de client |
| Prelungirea Y (câte minute se adaugă) | tot site-ul | 10 min — cerut de client |
| Limita de prelungiri | tot site-ul | fără limită, ca la PIPA |
| Schimbarea valorilor de mai sus | **pe o licitație anume** | opțional |

**De ce pe licitație și nu pe parte:** părțile aceleiași licitații sunt aceeași vânzare, a aceluiași crescător. Reguli diferite între Partea 1 și Partea 2 l-ar încurca pe cumpărător fără niciun câștig.

**Regulă de corectitudine:** valorile se **îngheață la pornirea părții**. Schimbarea lor în Setări nu atinge licitațiile deja pornite — nimeni nu trebuie să afle la minutul 58 că regula s-a schimbat.

**[EXISTĂ]** Setarea globală există deja (acum 2 minute / 2 minute). Rămân de adăugat modificarea pe licitație și înghețarea la pornire.

---

## 5. Taxe

### 5.1. Ce taxe există

| Taxă | Cine plătește | Formă | Exemplu |
|---|---|---|---|
| **Taxă de administrare** | cumpărătorul | sumă fixă pe porumbel | PIPA: 80 EUR |
| **Comision cumpărător** | cumpărătorul | procent din prețul final | 0% |
| **Comision vânzător** | crescătorul | procent din prețul final | 12% |

**[EXISTĂ]** Toate trei există deja în Setări, la nivel de site.

### 5.2. Unde se setează — propunerea

| Nivel | Folosință |
|---|---|
| **Site** | valorile implicite, pentru orice licitație nouă |
| **Licitație** | **excepția negociată cu un crescător** — un crescător mare poate avea alt comision |
| ~~Parte~~ | nu propunem — două porumbei unul lângă altul, din aceeași vânzare, cu taxe diferite ar ridica întrebări |

### 5.3. Reguli

- **Taxa se vede înainte de licitare**, lângă butonul „Licitează": *„Preț + 80 EUR taxă de administrare"*. Cumpărătorul trebuie să știe totalul înainte să se angajeze.
- Taxele se **îngheață la pornirea părții**, ca și prelungirea.
- Pe factură și în e-mailul de câștig apar separat: preț, taxă, total.

---

## 6. Retragere și anulare — în locul „închiderii mai devreme"

### 6.1. De ce nu propunem închiderea mai devreme

- **Cele mai multe oferte vin în ultimele minute.** De aceea există prelungirea. Închiderea mai devreme ia exact momentul în care se formează prețul.
- **E nedreaptă cu cei care au așteptat finalul**, cum e normal să așteptați la o licitație. Omul își face planul după ora anunțată.
- **Se poate folosi abuziv:** crescătorul vede un preț care îi convine, cere închiderea, iar concurența nu mai apucă să liciteze. La prima astfel de situație, încrederea în platformă se pierde.
- Clientul însuși spune în același mesaj: *„licitațiile au un timp stabilit, iar acel timp trebuie să rămână"*.

### 6.2. Ce propunem în loc — situațiile reale

| Situație | Acțiune | Rezultat |
|---|---|---|
| Porumbelul s-a îmbolnăvit, a murit, serie greșită, pedigree contestat | **Retrage porumbelul** | închis **fără câștigător**; ofertanții sunt anunțați; ceilalți porumbei continuă normal |
| Crescătorul renunță, suspiciune de fraudă | **Anulează licitația** | toți porumbeii închiși **fără câștigător**; toți ofertanții anunțați |

Pentru ambele: **motivul e obligatoriu**, apare pe pagina porumbelului și rămâne în jurnal.

> **De discutat cu clientul:** în mesajul pigeon2 a cerut explicit să poată închide mai repede. Trebuie aflat la ce situație se gândea. Dacă e una din tabelul de mai sus, retragerea o acoperă. Dacă vrea totuși închidere cu câștigător, o construim — cu motiv obligatoriu, anunț către toți ofertanții și urmă în jurnal.

---

## 7. Licitarea **[EXISTĂ]**

- licitare separată pe fiecare porumbel;
- **licitare automată cu plafon ascuns** — cumpărătorul spune până unde merge, sistemul licitează pentru el. La plafoane egale, câștigă cel care l-a pus primul;
- pasul minim după tabelul de trepte din Setări;
- verificarea ofertei înainte de salvare;
- actualizare pe loc, pe toate ecranele deschise;
- istoric cu poreclă, nu cu numele real.

**De adăugat:** pasul minim modificabil pe licitație (opțional, ca prelungirea și taxele).

---

## 8. Paginile publice

### 8.1. Lista licitațiilor

Carduri cu: copertă, titlul licitației, crescătorul, numărul de porumbei, data închiderii (a primei părți active), link. Mai multe licitații simultan, de la crescători diferiți. Sub listă, căutarea în toți porumbeii.

### 8.2. Pagina licitației

- **Prezentare:** copertă, titlu, subtitlu, descriere, informații despre crescător, număr de porumbei, **media curentă pe porumbel**, data închiderii, butoane de distribuire.
- **Afișare:** comutator Grid / Listă și buton de filtrare.
- **Părțile**, fiecare pliabilă, cu numele, numărul de porumbei, ora de închidere și cronometrul.

### 8.3. Cardul porumbelului

Număr (`1.01`) · fotografie · fotografia ochiului · sex · serie inel · nume/titlu · descriere scurtă a performanțelor · crescător · ofertant · oferta curentă · porecla ofertantului · închidere · **„Licitează acum"**.

### 8.4. Pagina porumbelului

| Secțiune | Stare |
|---|---|
| fotografie mare, serie, nume, sex, an, crescător, ofertant | **[EXISTĂ]** |
| **fotografia ochiului**, separată | de adăugat |
| oferta curentă, buton, cronometru, istoric, „vezi toate ofertele" | **[EXISTĂ]** |
| bara fixă cu preț și buton la derulare | **[EXISTĂ]** |
| **taxa afișată lângă buton** | de adăugat |
| caracteristici (ochi, constituție, aripă, penaj) | **[EXISTĂ]**, lista e fixă — de făcut configurabilă din administrare |
| pedigree: poză sau PDF, mărire, arbore pe generații | **[EXISTĂ]** |
| **descărcare pedigree** | de adăugat |
| galerie cu mărire, video în pagină | **[EXISTĂ]** |
| **distribuire** (rețele, copiere link, e-mail) | de adăugat |
| legătura înapoi la licitație și parte | de adăugat |

---

## 9. Căutare și filtre

**[EXISTĂ]** Căutare în toți porumbeii, fără diferență de majuscule și diacritice, după nume, serie, linie, rubrică și crescător.

**De adăugat — filtre:** crescător · licitație · parte · sex · an · preț minim / maxim · active / închise · data închiderii · **fără oferte** · **unde am licitat eu**.

---

## 10. Notificări

| Moment | Stare |
|---|---|
| oferta mi-a fost depășită | **[EXISTĂ]** |
| licitația se închide curând | **[EXISTĂ]** |
| am câștigat / nu am câștigat | **[EXISTĂ]** |
| **am plasat o ofertă** (confirmare) | de adăugat |
| **porumbelul pe care am licitat s-a prelungit** | de adăugat |
| **porumbelul a fost retras / licitația anulată** | de adăugat |
| **partea mea a fost aprobată / are corecturi** (pentru crescător) | de adăugat, dacă e acceptată propunerea 2.2 |

**E-mailul de câștig** conține: numele și seria, fotografia, pedigree-ul, prețul, taxele, totalul, datele de contact și instrucțiunile de plată și livrare.

> **Dependență:** acum notificările se văd pe site și se scriu în jurnalul de e-mailuri, dar **nu pleacă e-mailuri reale**. Trebuie ales un serviciu de e-mail.

---

## 11. Panoul de administrare

- crescători: listă, adăugare, editare;
- licitații: adăugare, copertă, descriere, **excepții pe licitație** (prelungire, taxe, pas minim);
- părți: adăugare, ore, ordine;
- porumbei: adăugare în parte, ordine, mutare între părți *(doar înainte de pornire)*;
- verificare și aprobare *(dacă e acceptată propunerea 2.2)*;
- **previzualizare** exact cum va arăta pe site;
- **„Pornește partea"**, cu verificarea completitudinii;
- retragere porumbel / anulare licitație, cu motiv;
- **ofertele în timp real**, câștigătorii;
- **export rezultate** în Excel;
- retrimiterea notificărilor;
- import porumbei din Excel *(etapa 3; e nevoie de un fișier exemplu de la client)*.

---

## 12. Datele unui porumbel

ID intern · număr în parte · serie inel · țară · an · sex · nume · descriere · rezultate · crescător · ofertant · fotografie principală · **fotografia ochiului** · fotografii suplimentare · video · pedigree · caracteristici · preț de pornire · ofertă curentă · ora închiderii · stare (*ciornă, aprobat, activ, prelungit, închis, retras*) · motivul retragerii · câștigător · sumă finală · taxe înghețate.

---

## 13. Criterii de acceptare

1. Administratorul creează un crescător, o licitație pentru el și mai multe părți.
2. Fiecare parte are ora ei de închidere.
3. Porumbeii se numerotează automat `1.01`, `1.02`, … și se pot reordona înainte de pornire.
4. O parte incompletă nu pornește, iar butonul spune ce lipsește.
5. „Pornește partea" activează toți porumbeii în aceeași clipă.
6. După pornire, ora de închidere nu se mai poate muta.
7. Fiecare porumbel se licitează separat, cu licitare automată și istoric.
8. Taxa se vede lângă butonul de licitare, înainte de ofertă.
9. O ofertă în fereastra finală prelungește doar acel porumbel, cu valorile înghețate la pornire.
10. Schimbarea setărilor globale nu atinge părțile deja pornite.
11. Retragerea unui porumbel îl închide fără câștigător și îi anunță pe ofertanți; ceilalți continuă.
12. La final, câștigătorul e stabilit automat și primește toate datele, taxele și instrucțiunile.
13. Totul funcționează pe calculator, tabletă și telefon.
14. *(propunerea 2.2)* Crescătorul pregătește o parte, administratorul o corectează și o aprobă, după pornire crescătorul nu mai poate modifica.

---

## 14. Etape

| Etapa | Conținut | Ce poate testa clientul |
|---|---|---|
| **1** | structura (capitolul 1), stările și pornirea (3), prelungirea înghețată (4), pagina licitației și a porumbelului (8), administrarea de bază (11), mutarea datelor de test existente | o licitație cap-coadă: creare → părți → porumbei → pornire → licitare → închidere |
| **2** | taxe pe licitație și afișarea lor (5), retragere și anulare (6), fotografia ochiului, distribuire, descărcare pedigree, filtrele (9) | licitare cu taxe vizibile, filtre |
| **3** | fluxul crescătorului (2.2, dacă e acceptat), notificările noi (10), export, ofertele în timp real, import Excel | lucrul împreună cu un crescător |
| **4** | e-mailuri reale | depinde de alegerea serviciului |

---

## 15. De confirmat cu clientul

1. **Crescătorii pregătesc porumbeii**, iar el doar verifică și pornește partea (2.2)? Sau rămâne doar el?
2. **Închiderea mai devreme:** la ce situație se gândea? Îi ajung retragerea porumbelului și anularea licitației (6.2)?
3. **Pornirea:** pe loc, programată, sau ambele?
4. **Valorile implicite:** prelungirea 10 / 10 minute sau 5 / 5 ca la PIPA? Taxa de administrare — există, și cât? Comisionul vânzătorului — cât?
5. **Plata:** o încasează platforma, sau plătesc direct între ei?
6. **Denumirea grupului:** „Partea" sau „Lotul"?
7. **Porecla ofertantului:** o aprobă el, ca la PIPA?
8. **Prețul fix și prețul de rezervă**, construite deja: rămân?
9. Un **fișier Excel exemplu** cu porumbei, pentru import.
