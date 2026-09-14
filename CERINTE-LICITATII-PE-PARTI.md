# Cerințe — licitații pe părți, după modelul PIPA

**Versiunea 3** · 14 septembrie 2026, după răspunsurile clientului
**Pornește de la:** mesajele vocale (pigeon2–4), documentul generat din video, licitația Frații Alpdag de pe PIPA, răspunsurile scrise ale clientului din 14 septembrie și platforma construită până acum.

> **Ce s-a hotărât în versiunea 3**
> 1. **Porumbeii îi pun doar administratorii** — „Admin 1 și Admin 2. Exclus să pună altcineva!" Fluxul prin care crescătorii își puneau singuri porumbeii se oprește.
> 2. **Fiecare parte are dată și oră de început și de sfârșit**, puse de administrator. Partea pornește singură la ora de început, cu toți porumbeii deodată.
> 3. **„O dată licitația începută, rămâne începută."** Nu se oprește, nu se închide mai devreme, orele nu se mai mută.
> 4. **Prelungirea: 10 minute la o ofertă în ultimele 10 minute**, de câte ori e nevoie, până nu mai licitează nimeni.
> 5. **Aviz cu 30 de minute înainte de final:** tuturor celor cu cont, iar celor care au licitat, special, pentru porumbeii lor.
>
> Marcajele din text: **[CONFIRMAT]** = spus de client · **[DE ÎNTREBAT]** = încă deschis · **[EXISTĂ]** = deja construit

---

## 1. Structura

```
Crescător
  └─ Licitație
       └─ Partea 1, Partea 2, …      (maximum 20 de porumbei pe parte)
            └─ Porumbel 1.01, 1.02, …
                 └─ Oferte
```

- **Crescătorul** e profilul celui care vinde, făcut de administrator: nume, localitate, țară, fotografie, poveste, rezultate. Nu are nevoie de cont pe site.
- **Licitația** aparține unui singur crescător. **[CONFIRMAT]**
- **Partea** grupează porumbeii care pornesc și se închid împreună. Fiecare parte are orele ei. **[CONFIRMAT]**
- **Porumbelul** se licitează separat, cu prețul, istoricul și câștigătorul lui. **[CONFIRMAT]**
- **Numerotarea** e automată, parte.poziție: `1.01`, `1.02`, `2.01`. Ordinea se poate schimba cât partea nu a pornit.
- Denumirea grupului pe site: „Partea" sau „Lotul". **[DE ÎNTREBAT]**

---

## 2. Cine ce face

### 2.1. Administratorii **[CONFIRMAT]**

Clientul lucrează cu **doi administratori**, cu aceleași drepturi. Doar ei:

- creează și editează crescători, licitații și părți;
- adaugă, modifică și ordonează porumbeii;
- stabilesc data și ora de început și de sfârșit ale fiecărei părți;
- văd ofertele în timp real, câștigătorii și exportă rezultatele.

**De construit:** pagina **Administratori**, din care un administrator dă sau ia drepturile de administrator unui cont. Acum al doilea administrator s-ar putea face doar direct din baza de date.

**Fiecare acțiune rămâne în jurnal cu numele celui care a făcut-o** — cu doi administratori, trebuie să se știe cine a mutat ce. **[EXISTĂ]** jurnalul, cu autorul fiecărei acțiuni.

### 2.2. Crescătorii

- **Nu pot adăuga și nu pot modifica porumbei.** **[CONFIRMAT]**
- Paginile prin care crescătorii își puneau singuri porumbeii („Vinde un porumbel", cererea de cont de crescător, editarea lotului de către crescător) **se opresc**.
- Codul nu se șterge: rămâne oprit dintr-o setare, „Crescătorii pot adăuga porumbei: nu". **Nu se extinde** la structura nouă pe părți și nu se mai propune clientului. Dacă, după ce platforma merge, administratorii nu mai fac față introducerii datelor, subiectul se poate redeschide.

### 2.3. Cumpărătorii **[EXISTĂ]**

Își fac cont, își aleg o poreclă, licitează, primesc avize, plătesc.

---

## 3. Viața unei părți

```
Ciornă → Programată → Activă → Închisă
```

| Stare | Ce înseamnă | Ce se mai poate schimba |
|---|---|---|
| **Ciornă** | se completează; nu se vede pe site | orice |
| **Programată** | are ore stabilite; se vede pe site cu „Începe pe…" | orele și porumbeii, **până la ora de început** |
| **Activă** | se licitează | **nimic** din ce privește licitarea |
| **Închisă** | fiecare porumbel are câștigătorul lui, sau „nevândut" | nimic |

### 3.1. Programarea și pornirea **[CONFIRMAT]**

- Administratorul stabilește pentru fiecare parte **data și ora de început** și **data și ora de sfârșit**.
- Butonul **„Programează partea"** verifică dacă e completă, apoi o trece în „Programată".
- **La ora de început, toți porumbeii din parte pornesc în aceeași clipă**, singuri, fără altă apăsare. Pentru pornire imediată, ora de început se pune pe acum.
- Nu se poate porni un porumbel singur.
- **Nu se programează o parte incompletă.** Fiecare porumbel trebuie să aibă cel puțin serie, an, sex, o fotografie și preț de pornire. Butonul arată exact ce lipsește și la care porumbel.

### 3.2. După pornire **[CONFIRMAT]**

> *„O dată licitația începută, rămâne începută."*

- **Nu există buton de oprire sau de închidere mai devreme.**
- Orele de început și de sfârșit **nu se mai pot modifica**.
- Porumbeii nu se mai pot scoate din parte și nu se mai adaugă alții.
- Administratorul poate corecta doar greșeli de prezentare — o literă din nume, o poză —, fără să atingă prețul, orele sau ofertele. Corectura rămâne în jurnal. **[EXISTĂ]** regulile de corectură după prima ofertă.

**[DE ÎNTREBAT]** Ce se întâmplă dacă un porumbel moare sau se îmbolnăvește în timpul licitației? Regula de mai sus nu lasă nicio ieșire. Propunerea: administratorul îl poate **retrage**, fără câștigător, cu motiv scris și anunț către ofertanți, iar ceilalți porumbei continuă. Se construiește doar dacă o cere clientul.

### 3.3. Închiderea **[CONFIRMAT]**

- Toți porumbeii dintr-o parte au aceeași oră de sfârșit.
- Fiecare porumbel se poate prelungi separat (capitolul 4). Cei fără oferte târzii se închid la ora stabilită.
- La închidere, câștigătorul se stabilește automat. **[EXISTĂ]**

---

## 4. Prelungirea în ultimele minute **[CONFIRMAT]**

> *„Cine licitează pe un porumbel în ultimele 10 min o prelungește automat cu încă 10 min. Până nu mai licitează nimeni, și atunci rămâne câștigător."*

- O ofertă în ultimele **10 minute** prelungește **doar acel porumbel** cu **10 minute**.
- Se repetă la fiecare ofertă nouă, **fără limită**.
- Când trec 10 minute fără ofertă, porumbelul se închide, iar cel mai mare ofertant câștigă.

| Setare | Valoare implicită |
|---|---|
| Fereastra (câte minute înainte de final) | 10 |
| Prelungirea (câte minute se adaugă) | 10 |
| Limita de prelungiri | fără limită |

- Valorile se schimbă din **Setări**. **[EXISTĂ]** setarea, acum 2 / 2 minute cu maximum 50 de prelungiri — de pus 10 / 10, fără limită.
- Se **îngheață la programarea părții**: o schimbare în Setări nu atinge părțile deja programate sau pornite.

---

## 5. Taxe **[DE ÎNTREBAT]**

| Taxă | Cine plătește | Formă | Exemplu |
|---|---|---|---|
| Taxă de administrare | cumpărătorul | sumă fixă pe porumbel | PIPA: 80 EUR |
| Comision cumpărător | cumpărătorul | procent din prețul final | 0% |
| Comision vânzător | crescătorul | procent din prețul final | 12% |

**[EXISTĂ]** Toate trei, în Setări, la nivel de site.

Propunerea rămâne:
- **setate pe site**, cu posibilitatea unei **excepții pe licitație**, pentru un crescător cu alt contract;
- **afișate lângă butonul „Licitează"**, înainte de ofertă;
- **înghețate la programarea părții**.

Clientul trebuie să spună ce taxe există, cât sunt, și cine încasează plata (capitolul 13).

---

## 6. Licitarea **[EXISTĂ]**

- licitare separată pe fiecare porumbel;
- **licitare automată cu plafon ascuns** — cumpărătorul spune până unde merge, sistemul licitează pentru el. La plafoane egale câștigă cel care l-a pus primul;
- pasul minim după tabelul de trepte din Setări;
- verificarea ofertei înainte de salvare;
- actualizare pe loc, pe toate ecranele deschise;
- istoric cu poreclă, nu cu numele real.

---

## 7. Paginile publice

### 7.1. Lista licitațiilor

Carduri cu: copertă, titlul licitației, crescătorul, numărul de porumbei, **„Începe pe…"** sau **„Se încheie pe…"**, link. Mai multe licitații simultan, de la crescători diferiți. Sub listă, căutarea în toți porumbeii.

### 7.2. Pagina licitației

- **Prezentare:** copertă, titlu, subtitlu, descriere, informații despre crescător, număr de porumbei, **media curentă pe porumbel**, orele, butoane de distribuire.
- **Afișare:** comutator Grid / Listă și buton de filtrare.
- **Părțile**, fiecare pliabilă, cu numărul de porumbei, ora de început sau de sfârșit și cronometrul.
- O parte **programată** se vede cu porumbeii ei, dar butonul de licitare apare abia la ora de început.

### 7.3. Cardul porumbelului

Număr (`1.01`) · fotografie · fotografia ochiului · sex · serie inel · nume/titlu · descriere scurtă · crescător · ofertant · oferta curentă · porecla ofertantului · închidere · **„Licitează acum"**.

### 7.4. Pagina porumbelului

| Secțiune | Stare |
|---|---|
| fotografie mare, serie, nume, sex, an, crescător, ofertant | **[EXISTĂ]** |
| fotografia ochiului, separată | de adăugat |
| oferta curentă, buton, cronometru, istoric, „vezi toate ofertele" | **[EXISTĂ]** |
| bara fixă cu preț și buton la derulare | **[EXISTĂ]** |
| taxa afișată lângă buton | de adăugat, după răspunsul la taxe |
| caracteristici (ochi, constituție, aripă, penaj) | **[EXISTĂ]**; de făcut configurabile din administrare |
| pedigree: poză sau PDF, mărire, arbore | **[EXISTĂ]** |
| descărcare pedigree | de adăugat |
| galerie cu mărire, video în pagină | **[EXISTĂ]** |
| distribuire (rețele, copiere link, e-mail) | de adăugat |
| legătura înapoi la licitație și parte | de adăugat |

---

## 8. Căutare și filtre

**[EXISTĂ]** Căutare în toți porumbeii, fără diferență de majuscule și diacritice, după nume, serie, linie, rubrică și crescător.

**De adăugat — filtre:** crescător · licitație · parte · sex · an · preț minim / maxim · active / închise · data închiderii · fără oferte · unde am licitat eu.

---

## 9. Avize și notificări

### 9.1. Cu 30 de minute înainte de final **[CONFIRMAT]**

> *„Când o licitație se apropie de final, să fie dat mail cu 30 min înainte de final, notificare, tuturor celor care au cont! Ca să știe că se încheie licitația unui CRESCĂTOR. Iar la cei care au cont și au licitat, special, și porumbelul la care au licitat."*

Două e-mailuri diferite, pentru fiecare parte care se apropie de final:

| Cui | Ce primește |
|---|---|
| **Tuturor celor cu cont** | *„Licitația crescătorului X — Partea 1 se încheie în 30 de minute"*, cu link la licitație. **Un singur e-mail pe parte**, nu câte unul pe porumbel. |
| **Celor care au licitat în acea parte** | *„Porumbeii pe care ai licitat se închid în 30 de minute"*, cu **lista porumbeilor lor**, oferta curentă și dacă sunt pe primul loc sau au fost depășiți. Primesc acest e-mail **în locul** celui general, nu pe amândouă. |

- Cele 30 de minute sunt o **setare**, cu 30 implicit.
- Avizul pleacă **o singură dată** pe parte, chiar dacă prelungirile mută ora de final.
- **[EXISTĂ]** un aviz „se închide curând", dar pleacă cu 60 de minute înainte, câte unul pe fiecare porumbel, doar către ofertanți și cei care l-au pus la favorite. De refăcut după regula de mai sus.

**Atenție la regulile de protecție a datelor.** E-mailul către *toți cei cu cont* e o reclamă pentru o licitație, nu un mesaj despre ceva ce au făcut ei. Propunerea:
- la înregistrare, o bifă **nebifată** dinainte: *„Vreau să primesc un aviz când se încheie o licitație"*;
- aceeași alegere în **Contul meu**, de schimbat oricând;
- link de dezabonare în fiecare e-mail;
- conturile existente, care n-au bifat nimic, primesc doar e-mailurile despre porumbeii pe care au licitat.

E-mailul despre porumbeii pe care ai licitat e legat de o acțiune a ta și nu cere bifă.

### 9.2. Celelalte avize

| Moment | Stare |
|---|---|
| oferta mi-a fost depășită | **[EXISTĂ]** |
| am câștigat / nu am câștigat | **[EXISTĂ]** |
| am plasat o ofertă (confirmare) | de adăugat |
| porumbelul pe care am licitat s-a prelungit | de adăugat |

**E-mailul de câștig** conține: numele și seria, fotografia, pedigree-ul, prețul, taxele, totalul, datele de contact și instrucțiunile de plată și livrare.

### 9.3. Dependență critică

**Acum nu pleacă e-mailuri reale.** Avizele se văd pe site și se scriu în jurnalul de e-mailuri din administrare. Regula clientului se bazează pe e-mail, deci **alegerea serviciului de e-mail trece în etapa 1**, nu la final.

---

## 10. Panoul de administrare

- **administratori**: dare și retragere de drepturi;
- crescători: listă, adăugare, editare;
- licitații: adăugare, copertă, descriere, excepții de taxe pe licitație;
- părți: ore de început și de sfârșit, ordine, **„Programează partea"**;
- porumbei: adăugare în parte, ordine, mutare între părți — **doar înainte de ora de început**;
- **previzualizare** exact cum va arăta pe site;
- ofertele în timp real, câștigătorii;
- export rezultate în Excel;
- retrimiterea avizelor;
- import porumbei din Excel *(etapa 3; e nevoie de un fișier exemplu)*.

---

## 11. Datele unui porumbel

ID intern · număr în parte · serie inel · țară · an · sex · nume · descriere · rezultate · crescător · ofertant · fotografie principală · fotografia ochiului · fotografii suplimentare · video · pedigree · caracteristici · preț de pornire · ofertă curentă · ora închiderii · stare (*ciornă, programat, activ, prelungit, închis*) · câștigător · sumă finală · taxe înghețate.

---

## 12. Criterii de acceptare

1. Doi administratori pot lucra în paralel; jurnalul arată cine a făcut fiecare modificare.
2. Un crescător, un cumpărător sau un vizitator **nu poate** adăuga sau modifica porumbei — nici din pagini, nici direct prin cereri către server.
3. Administratorul creează un crescător, o licitație pentru el și mai multe părți, fiecare cu data și ora de început și de sfârșit.
4. Porumbeii se numerotează automat `1.01`, `1.02`, … și se reordonează înainte de pornire.
5. O parte incompletă nu se poate programa, iar butonul spune ce lipsește.
6. La ora de început, toți porumbeii din parte pornesc în aceeași clipă, fără altă apăsare.
7. După pornire, orele nu se pot schimba, iar partea nu se poate opri.
8. O ofertă în ultimele 10 minute prelungește doar acel porumbel cu 10 minute, de câte ori e nevoie; fără oferte 10 minute, porumbelul se închide cu câștigător.
9. Schimbarea setărilor nu atinge părțile deja programate sau pornite.
10. Cu 30 de minute înainte de final pleacă un singur aviz pe parte către cei cu cont care au ales să-l primească, iar ofertanții primesc lista porumbeilor lor.
11. La final, câștigătorul e stabilit automat și primește toate datele și instrucțiunile.
12. Totul funcționează pe calculator, tabletă și telefon.

---

## 13. Etape

| Etapa | Conținut | Ce poate testa clientul |
|---|---|---|
| **1** | structura (1); administratorii și oprirea fluxului crescătorilor (2); programarea, pornirea automată și blocarea după pornire (3); prelungirea 10 / 10 (4); pagina licitației și a porumbelului (7); administrarea de bază (10); avizul de 30 de minute (9.1); **serviciul de e-mail**; mutarea datelor de test existente | o licitație cap-coadă: creare → părți → porumbei → programare → pornire automată → licitare → prelungire → aviz → închidere |
| **2** | taxe și afișarea lor (5); fotografia ochiului, distribuire, descărcare pedigree; filtrele (8) | licitare cu taxe vizibile, filtre |
| **3** | export, ofertele în timp real, import Excel, avizele noi (9.2) | lucru la volum |

---

## 14. Încă de întrebat clientul

1. **Plata:** o încasează platforma și îi dă banii crescătorului, sau câștigătorul plătește direct crescătorului?
2. **Taxele:** există taxă de administrare pe porumbel, ca la PIPA? Cât e comisionul crescătorului?
3. **Un porumbel mort sau bolnav** în timpul licitației: îl poate retrage administratorul, fără câștigător?
4. **Avizul de 30 de minute pentru toți:** ok cu bifa la înregistrare, pe care omul o alege el?
5. **Denumirea grupului:** „Partea" sau „Lotul"?
6. **Porecla ofertantului:** o aprobă administratorul, ca la PIPA?
7. **Prețul fix și prețul de rezervă**, construite deja: rămân?
8. Un **fișier Excel exemplu** cu porumbei, pentru import.
