# Cerințe — licitații pe crescători și loturi, după modelul PIPA

**Versiunea 4** · 14 septembrie 2026, seara, după al doilea set de răspunsuri
**Pornește de la:** mesajele vocale (pigeon2–4), documentul generat din video, licitația Frații Alpdag de pe PIPA, răspunsurile scrise ale clientului din 14 septembrie (două seturi) și platforma construită până acum.

> **Ce s-a hotărât în versiunea 4**
> 1. **Denumirea e „Lotul".** Lotul 1 are maximum 20 de porumbei; porumbeii se numesc **Lotul 1.01, Lotul 1.02…**
> 2. **Fiecare lot are butonul lui de start.** Primul lot pornește și licitația crescătorului; celelalte loturi pornesc când vrea administratorul (exemplu: lotul 1 azi, lotul 2 peste 3 zile).
> 3. **Volum: 15 crescători deodată, câte 5 loturi, câte 20 de porumbei** — până la **1.500 de porumbei** în licitație în același timp.
> 4. **Comisionul se stabilește pe fiecare licitație** (5, 10, 15, 16, 23%…).
> 5. **Plata nu trece prin site:** transfer în contul firmei sau numerar. Administratorul își reține comisionul și îi trimite crescătorului restul.
> 6. **Înregistrarea cere nume, telefon, adresă, e-mail și poreclă liberă, iar contul îl aprobă administratorul.**
> 7. **Prețul fix și prețul de rezervă rămân.**
> 8. **Datele porumbeilor le primește administratorul pe e-mail de la crescători** și le introduce el; importul din Excel nu mai e necesar.
>
> Marcajele din text: **[CONFIRMAT]** = spus de client · **[DE ÎNTREBAT]** = încă deschis · **[EXISTĂ]** = deja construit

---

## 1. Structura

```
Licitația crescătorului „Burca Ionuț"
  ├─ Lotul 1          (4, 8, 15… maximum 20 de porumbei)
  │    ├─ Lotul 1.01  → un porumbel
  │    ├─ Lotul 1.02
  │    └─ …
  ├─ Lotul 2          (pornit, de exemplu, peste 3 zile)
  └─ … până la Lotul 5
```

- **Crescătorul** e profilul celui care vinde, făcut de administrator: nume, localitate, țară, fotografie, poveste, rezultate. Nu are cont pe site.
- **Licitația** aparține unui singur crescător și are o descriere. **[CONFIRMAT]**
- **Lotul** grupează porumbeii care pornesc și se închid împreună. Are data și ora lui de început și de sfârșit. **[CONFIRMAT]**
- **Porumbelul** se licitează separat, cu prețul, istoricul și câștigătorul lui. **[CONFIRMAT]**
- **Numerotarea** e automată: `Lotul 1.01`, `Lotul 1.02`, `Lotul 2.01`. Ordinea se poate schimba cât lotul nu a pornit. **[CONFIRMAT]**

### 1.1. Limite **[CONFIRMAT]**

| Ce | Maximum |
|---|---|
| licitații de crescători active în același timp | 15 |
| loturi într-o licitație | 5 |
| porumbei într-un lot | 20 |
| **porumbei în licitație în același timp** | **1.500** |

Limitele de 5 loturi și 20 de porumbei se setează din Setări, ca să nu fie nevoie de programator dacă se schimbă.

---

## 2. Cine ce face

### 2.1. Administratorii **[CONFIRMAT]**

Doi administratori, cu aceleași drepturi. Doar ei:

- creează crescători, licitații și loturi și adaugă porumbeii;
- stabilesc orele loturilor și le pornesc;
- stabilesc comisionul fiecărei licitații;
- **aprobă conturile noi**;
- marchează plățile, predarea porumbeilor și decontarea cu crescătorul.

**De construit:** pagina **Administratori**, din care se dau sau se iau drepturile de administrator. Fiecare acțiune rămâne în jurnal cu numele celui care a făcut-o. **[EXISTĂ]** jurnalul.

### 2.2. Crescătorii **[CONFIRMAT]**

- **Nu au cont și nu pun porumbei.** Trimit datele pe e-mail: poze, pedigree, informații, seria inelului. Administratorul le introduce.
- Paginile prin care crescătorii își puneau singuri porumbeii („Vinde un porumbel", cererea de cont de crescător, editarea lotului de către crescător) **se opresc**. Codul rămâne oprit dintr-o setare, nu se șterge și nu se extinde.

### 2.3. Cumpărătorii

Își fac cont, așteaptă aprobarea, licitează, primesc avize, plătesc firmei (capitolul 6).

---

## 3. Licitația și loturile

### 3.1. Crearea **[CONFIRMAT]**

1. Administratorul creează **licitația crescătorului**: crescătorul, titlul, descrierea, coperta, **comisionul**.
2. Adaugă **Lotul 1**: data și ora de început, data și ora de sfârșit.
3. Introduce porumbeii în Lotul 1 (maximum 20).
4. Apasă **„Start Lotul 1"**.
5. Mai târziu adaugă și pornește Lotul 2, Lotul 3… în același fel.

**Datele licitației crescătorului.** Clientul a spus că le setează și pe ele. Ca să nu existe două ore care să se contrazică, propunerea e ca **licitația să ia orele singură din loturi**: începe odată cu primul lot, se termină odată cu ultimul. Pe site apare *„Licitația Burca Ionuț · 14 – 24 septembrie"*. **[DE ÎNTREBAT]**

### 3.2. Butonul „Start lot" **[CONFIRMAT]**

- **Toți porumbeii din lot pornesc deodată**: 4, 8, 15 sau 20, niciodată unul câte unul.
- **Primul lot pornit face licitația crescătorului vizibilă și activă.**
- Butonul **verifică lotul înainte**: fiecare porumbel trebuie să aibă cel puțin serie, an, sex, o fotografie și preț de pornire. Dacă lipsește ceva, spune exact ce și la care porumbel, și nu pornește.
- **Dacă ora de început a trecut** sau e acum, lotul pornește imediat.
- **Dacă ora de început e în viitor**, lotul apare pe site cu „Începe pe…" și pornește singur la ora aceea.

### 3.3. Stările unui lot

| Stare | Ce înseamnă | Ce se mai poate schimba |
|---|---|---|
| **Ciornă** | se completează; nu se vede pe site | orice |
| **Programat** | s-a apăsat Start, ora de început e în viitor | orele și porumbeii, până la ora de început |
| **Activ** | se licitează | **nimic** din ce privește licitarea |
| **Închis** | fiecare porumbel are câștigătorul lui, sau „nevândut" | nimic |

### 3.4. După pornire **[CONFIRMAT]**

> *„O dată licitația începută, rămâne începută."*

- **Nu există buton de oprire sau de închidere mai devreme.**
- Orele lotului **nu se mai pot modifica**; porumbeii nu se mai scot și nu se mai adaugă.
- Administratorul poate corecta doar greșeli de prezentare — o literă din nume, o poză —, fără să atingă prețul, orele sau ofertele. Corectura rămâne în jurnal. **[EXISTĂ]** regulile de corectură după prima ofertă.

**[DE ÎNTREBAT]** Un porumbel moare sau se îmbolnăvește în timpul licitației: administratorul îl poate retrage, fără câștigător? Nu se construiește până nu răspunde clientul.

### 3.5. Închiderea **[CONFIRMAT]**

- Toți porumbeii dintr-un lot au aceeași oră de sfârșit.
- Fiecare porumbel se poate prelungi separat (capitolul 4). Cei fără oferte târzii se închid la ora stabilită.
- La închidere, câștigătorul se stabilește automat. **[EXISTĂ]**

---

## 4. Prelungirea **[CONFIRMAT]**

> *„Cine licitează pe un porumbel în ultimele 10 min o prelungește automat cu încă 10 min. Până nu mai licitează nimeni, și atunci rămâne câștigător."*

- O ofertă în ultimele **10 minute** prelungește **doar acel porumbel** cu **10 minute**, de câte ori e nevoie, **fără limită**.
- Valorile se schimbă din Setări și **se îngheață la pornirea lotului**. **[EXISTĂ]** setarea, acum 2 / 2 minute cu maximum 50 de prelungiri — de pus 10 / 10, fără limită.

---

## 5. Comisionul **[CONFIRMAT]**

> *„Comisionul să pot să-l setez la fiecare licitație, cât doresc eu: 5, 10, 15, 16, 23 etc."*

- **Fiecare licitație de crescător are comisionul ei, în procente.** Valoarea implicită vine din Setări. **[EXISTĂ]** comisionul la nivel de site (acum 12%).
- Comisionul e **o înțelegere între administrator și crescător**. Cumpărătorul nu îl vede și nu plătește nimic în plus, deci **se poate schimba și după pornire**. Orice schimbare rămâne în jurnal.
- **Nu există taxă pentru cumpărător:** plătește exact prețul cu care a câștigat. **[DE ÎNTREBAT — de confirmat]**

---

## 6. Plata, predarea și decontarea **[CONFIRMAT]**

> *„Plata se face în contul firmei sau cash și nu trebuie legată de site. Omul primește porumbeii după ce îi achită. Eu îmi rețin comisionul și trimit banii crescătorului."*

### 6.1. Ce se schimbă față de ce există

- **Plata online dispare** de pe site: butonul „Plătește" și integrarea Stripe din planuri. **[EXISTĂ]** o plată simulată — se scoate.
- **Nu mai e nevoie de cont Stripe.**

### 6.2. Câștigătorul

La închidere, câștigătorul primește **pe site și pe e-mail**:
- porumbelul (Lotul 1.04, nume, serie, fotografie) și **suma de plată**;
- **datele de plată ale firmei**: denumire, IBAN, bancă, luate din Setări **[EXISTĂ]**, plus mențiunea că se poate plăti și numerar;
- regula: **porumbeii se predau după plată**;
- telefonul de contact.

### 6.3. Evidența administratorului

Pentru fiecare porumbel vândut, o fișă cu:

| Pas | Cine marchează | Ce se notează |
|---|---|---|
| **Plătit** | administratorul | transfer sau numerar, data |
| **Predat** | administratorul | data, transportatorul (opțional) |

Pentru fiecare licitație de crescător, **decontul**:

| Rând | Exemplu |
|---|---|
| total vândut (doar porumbeii plătiți) | 3.200 EUR |
| comision (15%) | 480 EUR |
| **de plătit crescătorului** | **2.720 EUR** |
| decontat crescătorului | da / nu, data |

- Decontul se exportă în Excel.
- Porumbeii încă neplătiți apar separat, ca să nu intre în sumă înainte de vreme.

---

## 7. Conturile de cumpărător

### 7.1. Înregistrarea **[CONFIRMAT]**

> *„Logarea pe site se face cu numele, nr. tel., adresa, adresa de mail și nick name, unde poate să scrie ce vrea: poreclă / nume / cod. Logarea o aprobă administratorul!"*

| Câmp | Obligatoriu | Stare |
|---|---|---|
| Nume și prenume | da | **[EXISTĂ]** |
| E-mail | da | **[EXISTĂ]** |
| Parolă | da | **[EXISTĂ]** |
| Telefon | da | **[EXISTĂ]** câmpul, dar nu e cerut la înregistrare |
| **Adresă**: stradă și număr, localitate, județ, cod poștal, țară | da | de adăugat |
| **Poreclă** | da | **[EXISTĂ]**, dar acceptă doar litere latine, cifre, `-` și `_` — de lărgit |

**Porecla** devine liberă: poreclă, nume sau cod, cu spații și diacritice, între 2 și 30 de caractere. Rămâne **unică**: două conturi nu pot licita sub același nume, altfel istoricul ofertelor ar înșela.

### 7.2. Aprobarea **[CONFIRMAT]**

- Contul nou intră în stare **„Așteaptă aprobarea"**.
- Administratorul vede conturile noi într-o listă, **cu numărul lor lângă meniu**, și le aprobă sau le respinge. Motivul respingerii e opțional.
- La aprobare, omul primește e-mail.

**[DE ÎNTREBAT]** Cât timp așteaptă aprobarea, omul:
- **a)** poate intra în cont și vedea licitațiile, dar **nu poate licita** — propunerea noastră, ca să nu plece de pe site;
- **b)** nu poate intra deloc.

**[DE ÎNTREBAT]** Conturile făcute deja pe site: le aprobăm pe toate, și le cerem telefonul și adresa la prima ofertă?

---

## 8. Licitarea **[EXISTĂ]**

- licitare separată pe fiecare porumbel;
- **licitare automată cu plafon ascuns**; la plafoane egale câștigă cel care l-a pus primul;
- pasul minim după tabelul de trepte din Setări;
- verificarea ofertei înainte de salvare;
- actualizare pe loc, pe toate ecranele deschise;
- istoric cu porecla, nu cu numele real;
- **preț de rezervă**, cu suma ascunsă. **[CONFIRMAT]** că rămâne.

**De adăugat:** doar conturile **aprobate** pot licita.

---

## 9. Preț fix **[CONFIRMAT că rămâne]**

Secțiunea „Preț fix" rămâne **separată de licitații**: un porumbel la preț fix nu stă într-un lot și nu are oră de închidere. Primul care apasă „Cumpără" îl ia, iar plata se face tot în contul firmei sau numerar (capitolul 6). **[DE ÎNTREBAT — de confirmat că e separată]**

---

## 10. Paginile publice

### 10.1. Lista licitațiilor

Carduri, câte unul pe crescător: copertă, numele crescătorului, titlul, numărul de loturi și de porumbei, perioada, link. Până la 15 simultan. Sub listă, căutarea în toți porumbeii.

### 10.2. Pagina licitației crescătorului

- **Prezentare:** copertă, titlu, descriere, informații despre crescător, perioada, număr de porumbei, **media curentă pe porumbel**, butoane de distribuire.
- **Afișare:** comutator Grid / Listă și buton de filtrare.
- **Loturile**, fiecare pliabil, cu numărul de porumbei, ora de început sau de sfârșit și cronometrul. Un lot **programat** se vede cu porumbeii lui, dar butonul de licitare apare abia la ora de început.

### 10.3. Cardul porumbelului

**Lotul 1.01** · fotografie · fotografia ochiului · sex · serie inel · nume · descriere scurtă · crescător · oferta curentă · porecla ofertantului · închidere · **„Licitează acum"**.

### 10.4. Pagina porumbelului

| Secțiune | Stare |
|---|---|
| fotografie mare, serie, nume, sex, an, crescător | **[EXISTĂ]** |
| fotografia ochiului, separată | de adăugat |
| oferta curentă, buton, cronometru, istoric, „vezi toate ofertele" | **[EXISTĂ]** |
| bara fixă cu preț și buton la derulare | **[EXISTĂ]** |
| caracteristici (ochi, constituție, aripă, penaj) | **[EXISTĂ]**; de făcut configurabile din administrare |
| pedigree: poză sau PDF, mărire, arbore | **[EXISTĂ]** |
| descărcare pedigree | de adăugat |
| galerie cu mărire, video în pagină | **[EXISTĂ]** |
| distribuire (rețele, copiere link, e-mail) | de adăugat |
| legătura înapoi la licitație și lot | de adăugat |

---

## 11. Căutare și filtre

**[EXISTĂ]** Căutare în toți porumbeii, fără diferență de majuscule și diacritice.

**De adăugat — filtre:** crescător · licitație · lot · sex · an · preț minim / maxim · active / închise · data închiderii · fără oferte · unde am licitat eu.

---

## 12. Avize și notificări

### 12.1. Cu 30 de minute înainte de final **[CONFIRMAT]**

| Cui | Ce primește |
|---|---|
| **Tuturor celor cu cont** (care au ales să primească) | *„Lotul 1 al crescătorului Burca Ionuț se încheie în 30 de minute"*, cu link |
| **Celor care au licitat în acel lot** | lista porumbeilor lor, oferta curentă și dacă sunt pe primul loc sau depășiți — **în locul** celui general |

**La volumul cerut, e-mailurile trebuie grupate.** Cu 15 crescători și câte 5 loturi, pot fi zeci de loturi care se închid în aceeași seară. Un e-mail pe lot înseamnă zeci de e-mailuri pentru același om și, repede, adresa noastră trecută la spam. Regula: **un singur e-mail pe om pentru toate loturile care se închid în aceeași jumătate de oră**, cu lista lor.

- Cele 30 de minute sunt o setare.
- Avizul pleacă **o singură dată** pe lot, chiar dacă prelungirile mută ora de final.
- **[EXISTĂ]** un aviz „se închide curând", dar la 60 de minute și câte unul pe fiecare porumbel — de refăcut.

**Protecția datelor:** e-mailul către toți cei cu cont e o reclamă, deci cere acordul omului. La înregistrare, o bifă **nebifată dinainte**: *„Vreau să primesc un aviz când se încheie o licitație"*, aceeași alegere în Contul meu, link de dezabonare în fiecare e-mail. E-mailul despre porumbeii pe care ai licitat nu cere bifă. **[DE ÎNTREBAT]**

### 12.2. Celelalte avize

| Moment | Stare |
|---|---|
| oferta mi-a fost depășită | **[EXISTĂ]** |
| am câștigat — cu datele de plată | **[EXISTĂ]** avizul; de adăugat datele de plată |
| nu am câștigat | **[EXISTĂ]** |
| **contul meu a fost aprobat / respins** | de adăugat |
| confirmare ofertă | de adăugat |

### 12.3. Dependență critică

**Acum nu pleacă e-mailuri reale.** Avizul de 30 de minute, aprobarea contului și e-mailul de câștig cu datele de plată depind toate de e-mail, deci **alegerea serviciului de e-mail intră în etapa 1**.

---

## 13. Panoul de administrare

- **administratori**: dare și retragere de drepturi;
- **conturi de aprobat**, cu numărul lor lângă meniu;
- crescători: listă, adăugare, editare;
- licitații: adăugare, descriere, copertă, **comision**;
- loturi: ore de început și de sfârșit, **„Start lot"**;
- porumbei: adăugare în lot, ordine, mutare între loturi — doar înainte de pornire;
- previzualizare exact cum va arăta pe site;
- ofertele în timp real, câștigătorii;
- **plăți și predări**: Plătit (transfer / numerar), Predat;
- **decontul pe crescător**, cu export Excel;
- retrimiterea avizelor.

---

## 14. Performanță — pentru 1.500 de porumbei simultan

- **Pagina unui lot deschide o singură legătură în timp real**, pentru toți porumbeii din el, nu câte una pe porumbel. Cu 20 de carduri pe ecran și sute de vizitatori, altfel serverul ar ține zeci de mii de conexiuni. **[EXISTĂ]** legătura în timp real, dar pe porumbel.
- **Închiderea automată** trebuie să proceseze sute de porumbei în același minut, cu prelungirile lor, fără să întârzie închiderea altora.
- **Test de încărcare** înainte de lansare: 15 licitații × 5 loturi × 20 de porumbei, oferte simultane în ultimele minute.

---

## 15. Criterii de acceptare

1. Doi administratori pot lucra în paralel; jurnalul arată cine a făcut fiecare modificare.
2. Nimeni în afară de administratori nu poate adăuga sau modifica porumbei — nici din pagini, nici prin cereri directe către server.
3. Administratorul creează licitația unui crescător, cu comision propriu, și până la 5 loturi a câte maximum 20 de porumbei.
4. Porumbeii se numerotează automat `Lotul 1.01`, `Lotul 1.02`, … și se reordonează înainte de pornire.
5. „Start lot" pornește toți porumbeii din lot deodată: imediat, sau singur la ora de început.
6. Un lot incomplet nu pornește, iar butonul spune ce lipsește.
7. Lotul 2 al aceluiași crescător se poate porni zile mai târziu, fără să afecteze Lotul 1.
8. După pornire, orele nu se pot schimba, iar lotul nu se poate opri.
9. O ofertă în ultimele 10 minute prelungește doar acel porumbel cu 10 minute, de câte ori e nevoie.
10. Un cont nou nu poate licita până nu e aprobat de administrator.
11. Porecla poate conține spații și diacritice și e unică.
12. Câștigătorul primește suma și datele de plată ale firmei; nicio plată nu trece prin site.
13. Administratorul marchează plata și predarea, iar decontul arată corect comisionul și suma de plătit crescătorului.
14. Cu 30 de minute înainte de final, fiecare om primește **un singur** e-mail pentru loturile care se închid în acea jumătate de oră.
15. Platforma rezistă la 1.500 de porumbei activi simultan.
16. Totul funcționează pe calculator, tabletă și telefon.

---

## 16. Etape

| Etapa | Conținut | Ce poate testa clientul |
|---|---|---|
| **1** | structura și limitele (1); administratorii, oprirea fluxului crescătorilor (2); licitații, loturi, „Start lot", blocarea după pornire (3); prelungirea 10 / 10 (4); comisionul pe licitație (5); **înregistrarea cu adresă și aprobarea conturilor** (7); paginile licitației și ale porumbelului (10); **serviciul de e-mail** și avizul de 30 de minute (12.1); mutarea datelor de test existente | o licitație de crescător cap-coadă: creare → Lotul 1 → start → cont aprobat licitează → prelungire → aviz → închidere |
| **2** | plata în afara site-ului: e-mailul de câștig cu datele de plată, Plătit / Predat, decontul pe crescător (6); scoaterea plății online | un lot vândut, plătit, predat, decontat |
| **3** | performanța pentru 1.500 de porumbei și testul de încărcare (14); fotografia ochiului, distribuire, descărcare pedigree; filtrele (11); avizele rămase (12.2) | licitație la volum mare |

---

## 17. Încă de întrebat clientul

1. Mesajul „Punctul 9 — Da, se păstrează" se referea la **prețul fix și prețul de rezervă**?
2. **Orele licitației crescătorului:** le calculăm singure din loturi (începe cu primul, se termină cu ultimul)?
3. **Contul care așteaptă aprobarea:** poate intra și vedea licitațiile, fără să liciteze, sau nu poate intra deloc? Conturile existente le aprobăm pe toate?
4. **Cumpărătorul plătește doar prețul câștigat**, fără nicio taxă în plus?
5. **Un porumbel mort sau bolnav** în timpul licitației: îl poate retrage administratorul, fără câștigător?
6. **Avizul de 30 de minute pentru toți:** ok cu bifa la înregistrare?
7. **Prețul fix** rămâne o secțiune separată de licitații, cum e acum?
