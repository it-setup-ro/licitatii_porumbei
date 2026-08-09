# Research — Secțiunea 6.2: Date specifice porumbei
**Platformă:** No.1 & Best Pigeons | **Data:** 2026-08-08 | **Status:** ÎN LUCRU (se actualizează incremental)

> Regulă de trasabilitate: fiecare afirmație are sursă (URL) sau este marcată „propunere proprie".

## Cuprins
1. Descrierea unui porumbel (câmpuri de identificare)
2. Pedigree (arbore genealogic)
3. Rezultate / palmares
4. Media (poze, video, certificate ADN, documente)
5. Glosar bilingv RO/EN
6. Surse consultate + URL-uri inaccesibile

---

## 0. Notă de acces surse
- **auctions.pipa.be și www.pipa.be returnează HTTP 403 la WebFetch (2026-08-08)** — nu au putut fi observate direct. Compensat cu WebSearch (rezumate din rezultate indexate) și cu platforme de licitații accesibile (iPigeon/newipigeon.com). Fiecare afirmație despre PIPA de mai jos provine din rezultate de căutare, marcate ca atare.
- **pigeonboss.com este accesibil**, dar la data verificării este un hub de conținut editorial + magazin de suplimente (Jan de Wijs), **nu o platformă de licitații cu loturi individuale** — nu expune câmpuri de descriere porumbel. (Sursă: https://pigeonboss.com/ — observație directă WebFetch.)

## 1. Descrierea unui porumbel — câmpuri de identificare

### 1.1 Observat pe o pagină reală de lot (iPigeon — licitație SUA)
Sursă (observație directă): https://www.newipigeon.com/product/view/54009
- **Band/Ring number** în format `Belg.4184867-2019` (țară + serie + an).
- **Sex:** Hen (femelă).
- **Item # / număr de lot** intern platformei.
- **Origine/crescător:** „Bred from Pipa Elite Center", vânzător separat de crescător (Texas Center, Indiana) — deci platforma distinge *breeder* de *seller*.
- Descriere comercială liberă („SUPER QUALITY HEN", „INBRED PORSCHE 911") + referințe la părinți cu nume și inel.

### 1.2 PIPA (din rezultate de căutare; site inaccesibil direct)
- Paginile de lot PIPA includ **ring number** și **sex**; „the pedigree shown in the auction is the pedigree you will receive"; **puii vânduți pe PIPA sunt sexați prin test ADN**, la porumbeii adulți sexul e deja stabilit. (Sursă: rezultate WebSearch pentru FAQ PIPA — https://auctions.pipa.be/en/frequently-asked-questions, inaccesibil direct, HTTP 403.)

### 1.3 Model de câmpuri recomandat pentru platformă (propunere proprie, sintetizată din 1.1–1.2)
| Câmp | RO | EN | Note |
|---|---|---|---|
| Inel | Serie inel | Ring number | Format: cod țară + an + număr (ex. `RO 21 123456`, `BE 4184867-19`) — vezi §1.4 |
| An | An de naștere | Year of birth | Derivabil din inel, dar stocat separat |
| Sex | Mascul / Femelă | Cock / Hen | + opțiune „nesexat" pentru pui |
| Culoare | Culoare penaj | Colour | vocabular controlat, vezi §5 |
| Rasă/linie | Linie / origine (strain) | Strain / bloodline | ex. Janssen, Van den Bulck |
| Crescător | Crescător | Breeder | separat de vânzător |
| Nume | Numele porumbelului | Pigeon name | opțional, ex. „Porsche 911" |
| Ochi | Culoarea ochiului | Eye colour | folosit frecvent în standarde/expoziții |

### 1.4 Formatul inelului (ring number)
- Inelul oficial e emis anual de federația națională; conține codul țării, anul și un număr unic. Exemple observate: `Belg.4184867-2019` (iPigeon, sursă §1.1). Structura general acceptată: țară + an + serie. (Sursă: observație directă iPigeon + practica federațiilor FCI; de confirmat formatul RO exact cu FCPR — vezi §6.)

## 2. Pedigree

### 2.1 Observat (iPigeon, sursă §1.1)
- Lotul afișează **părinți și bunici cu nume + inel** în text, plus **documentul de pedigree oficial ca PDF/imagine** atașat lotului.

### 2.2 PIPA (din căutare; inaccesibil direct)
- PIPA garantează că pedigree-ul afișat în licitație e cel livrat cumpărătorului (sursa §1.2).

### 2.3 Convenții de afișare (de verificat suplimentar)
- Practica uzuală în columbofilie: arbore pe **4–5 generații**, tată sus / mamă jos, fiecare căsuță cu inel, nume, culoare, rezultate-cheie și origine. *(în curs de confirmare cu surse suplimentare)*

## 3. Rezultate / palmares

### 3.1 Observat (iPigeon, §1.1)
- Palmares prezentat ca listă de mențiuni: „1st National Ace Winners", „4th Place South Africa Million Dollar Final race", „Pattaya International One Loft race".

### 3.1bis Categorii românești de concurs (Regulamentul Național Columbofil — UNCR/columba.ro, observație directă)
Sursă: https://www.columba.ro/regulamentul-national-columbofil/ (WebFetch OK)
- **Viteză:** etape între **100–400 km**; normă porumbel: 5 etape, minim 750 km cumulat.
- **Demifond:** etape între **300–600 km**.
- **Fond:** etape **peste 500 km**; normă: 3 etape, minim 1500 km cumulat.
- **Maraton:** etape **peste 700 km**; normă: 2 etape.
- **Extrem:** etape **peste 900 km** (minim 850 km pe ruta Grecia).
- **General:** combină 2–4 etape din fiecare categorie inferioară.
- **Formula de punctaj (coeficient):** „Loc în clasament × 1000 / Nr. total de porumbei" — coeficient mai mic = performanță mai bună.
- **„As":** categorie superioară cu mai multe etape și kilometraj mai mare (ex. As Viteză: 8 etape, min. 5 centralizate, cumulat 1200 km).
- **Palmares multianual:** pentru palmares pe 2–3 ani, norma trebuie realizată în fiecare an; palmaresul cumulează normele anuale.
- Categoriile din campionatul FCPR: Viteză, Demifond, Fond, Maraton, General, As, cu palmares separat pentru porumbei de 2 ani. (Sursă: rezultate WebSearch — fcpr.ro/catalog/2020_catalog_fncpr.php, federatianationalacolumbofila.ro.)

**Implicație pentru platformă (propunere proprie):** modelul de date „rezultat" trebuie să conțină: denumire concurs/etapă, data, distanța (km), loc obținut, nr. total porumbei angajați, coeficient calculat, categoria (viteză/demifond/fond/maraton/extrem/one-loft), nivelul clasamentului (club/județean/zonal/național/internațional).

### 3.2 Categorii FCI (din WebSearch)
- FCI calculează categorii olimpice **A–J** (individual și pe echipe). (Sursă: rezultate WebSearch — dutchpigeons.nl/international-pigeon-racing-sport/ și pigeonsfci.net.)
- Categoriile „World Best Pigeon" FCI: **Speed/Short distance** (5 curse 100–400 km), **Middle distance** (4 curse 300–600 km), **Long distance** (3 curse >500 km), **All-round** (6 etape 100–>500 km), **Marathon** (2 curse >700 km), **Super Marathon** (2 etape >900 km). (Sursă: rezultate WebSearch — pigeonsfci.net/category/world-best-pigeon.html, racingpigeons.ro.)

*(secțiune în curs de completare)*

## 4. Media
### 4.1 Observat (iPigeon, §1.1)
- **6 fotografii** per lot, **pedigree PDF vizualizabil**, secțiune **video**.
### 4.2 PIPA (din căutare, §1.2)
- **Test ADN pentru sexare** la pui — implică certificat ADN ca document asociat.

*(secțiune în curs de completare)*

## 5. Glosar bilingv RO/EN
*(în curs de completare — surse: FCPR, FCI, PIPA)*

## 6. Surse consultate
- https://www.newipigeon.com/product/view/54009 — pagină de lot, observație directă (WebFetch OK).
- https://pigeonboss.com/ — observație directă (WebFetch OK): hub editorial, nu marketplace de loturi.
- https://auctions.pipa.be/en și https://www.pipa.be/en — **HTTP 403, inaccesibile direct**; informații doar via WebSearch.
- https://auctions.pipa.be/en/frequently-asked-questions — **HTTP 403**; conținut citat din snippete WebSearch.
- https://www.pigeonsfci.net/category/world-best-pigeon.html — via WebSearch (categorii World Best Pigeon).
- https://dutchpigeons.nl/international-pigeon-racing-sport/ — via WebSearch (categorii olimpice A–J).
